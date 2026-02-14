/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  RpcRequest,
  RpcResponse,
  RpcEvent,
  RpcMessage,
  CapabilityMethod,
  LogEntry,
  PanelSize,
  RuntimeState,
  SandboxConfig,
} from './types';
import { DEFAULT_SANDBOX_CONFIG } from './types';
import {
  generateIframeSrcDoc,
  generateLoadingSrcDoc,
  generateErrorSrcDoc,
} from './iframe_template';
import { validateSandboxSecurity } from './csp_security';

export interface CapabilityHandlers {
  'esql.query': (params: {
    query: string;
    params?: Record<string, unknown>;
    useContext?: boolean;
  }) => Promise<unknown>;
  'panel.getSize': () => Promise<PanelSize>;
  'render.setContent': (params: { html: string }) => Promise<void>;
  'render.setError': (params: { message: string }) => Promise<void>;
  'log.info': (params: { args: unknown[] }) => void;
  'log.warn': (params: { args: unknown[] }) => void;
  'log.error': (params: { args: unknown[] }) => void;
}

export interface BridgeOptions {
  /** Container element for the iframe */
  container: HTMLElement;
  /** User script code to execute */
  scriptCode: string;
  /** Sandbox configuration */
  config?: Partial<SandboxConfig>;
  /** Capability handlers provided by the host */
  handlers: CapabilityHandlers;
  /** Callback when runtime state changes */
  onStateChange?: (state: RuntimeState) => void;
  /** Callback when logs are captured */
  onLog?: (entry: LogEntry) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

/**
 * ScriptPanelBridge manages the lifecycle of a sandboxed iframe
 * and handles RPC communication between the host and the iframe.
 */
export class ScriptPanelBridge {
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLElement;
  private scriptCode: string;
  private config: SandboxConfig;
  private handlers: CapabilityHandlers;
  private onStateChange?: (state: RuntimeState) => void;
  private onError?: (error: Error) => void;
  private state: RuntimeState = 'idle';
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private scriptTimeout: ReturnType<typeof setTimeout> | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private destroyed = false;

  constructor(options: BridgeOptions) {
    this.container = options.container;
    this.scriptCode = options.scriptCode;
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...options.config };
    this.handlers = options.handlers;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
  }

  /**
   * Initialize and start the sandboxed iframe runtime.
   */
  async start(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Bridge has been destroyed');
    }

    this.setState('loading');

    // Create ready promise
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Set up message handler
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);

    // Create iframe with sandbox restrictions
    this.iframe = document.createElement('iframe');
    // Set sandbox attribute directly for better compatibility
    // Explicitly only 'allow-scripts' - NOT 'allow-same-origin' which is critical for security
    // See csp_security.ts for full security model documentation
    this.iframe.setAttribute('sandbox', 'allow-scripts');
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: transparent;
    `;

    // Validate sandbox security configuration (defense-in-depth)
    const validation = validateSandboxSecurity(this.iframe);
    if (!validation.isValid) {
      throw new Error(`Sandbox security validation failed: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[ScriptPanel] Security warnings:', validation.warnings);
    }

    // Show loading state initially
    this.iframe.srcdoc = generateLoadingSrcDoc();
    this.container.appendChild(this.iframe);

    // Wait for iframe to load, then inject actual content
    await new Promise<void>((resolve) => {
      if (this.iframe) {
        this.iframe.onload = () => resolve();
      } else {
        resolve();
      }
    });

    if (this.destroyed || !this.iframe) return;

    // Inject the actual script content
    this.iframe.srcdoc = generateIframeSrcDoc(this.scriptCode, this.config);

    // Set up script timeout
    this.scriptTimeout = setTimeout(() => {
      this.handleTimeout();
    }, this.config.scriptTimeout);

    // Wait for runtime ready signal
    try {
      await Promise.race([
        this.readyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Runtime initialization timeout')), 10000)
        ),
      ]);

      if (!this.destroyed) {
        this.setState('running');
      }
    } catch (error) {
      if (!this.destroyed) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Reload the iframe with new script code.
   */
  async reload(scriptCode?: string): Promise<void> {
    if (this.destroyed) return;

    if (scriptCode !== undefined) {
      this.scriptCode = scriptCode;
    }

    // Clear existing timeout
    if (this.scriptTimeout) {
      clearTimeout(this.scriptTimeout);
      this.scriptTimeout = null;
    }

    this.setState('loading');

    // Create new ready promise
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    if (this.iframe) {
      this.iframe.srcdoc = generateIframeSrcDoc(this.scriptCode, this.config);
    }

    // Set up new script timeout
    this.scriptTimeout = setTimeout(() => {
      this.handleTimeout();
    }, this.config.scriptTimeout);

    // Wait for ready
    try {
      await Promise.race([
        this.readyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Runtime initialization timeout')), 10000)
        ),
      ]);

      if (!this.destroyed) {
        this.setState('running');
      }
    } catch (error) {
      if (!this.destroyed) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Send an event to the iframe.
   */
  sendEvent(event: string, data?: unknown): void {
    if (this.destroyed || !this.iframe?.contentWindow) return;

    const message: RpcEvent = {
      type: 'event',
      event,
      data,
    };

    this.iframe.contentWindow.postMessage(message, '*');
  }

  /**
   * Destroy the bridge and clean up resources.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.scriptTimeout) {
      clearTimeout(this.scriptTimeout);
      this.scriptTimeout = null;
    }

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    this.setState('terminated');
  }

  /**
   * Get the current runtime state.
   */
  getState(): RuntimeState {
    return this.state;
  }

  private setState(state: RuntimeState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  private handleMessage(event: MessageEvent): void {
    // Only handle messages from our iframe
    if (this.destroyed || !this.iframe || event.source !== this.iframe.contentWindow) {
      return;
    }

    const msg = event.data as RpcMessage;
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    if (msg.type === 'request') {
      this.handleRequest(msg as RpcRequest);
    } else if (msg.type === 'event') {
      this.handleEvent(msg as RpcEvent);
    }
  }

  private async handleRequest(request: RpcRequest): Promise<void> {
    const { id, method, params } = request;

    // Validate method is in allow-list
    if (!this.isAllowedMethod(method)) {
      this.sendResponse(id, undefined, {
        message: `Method not allowed: ${method}`,
        code: 'METHOD_NOT_ALLOWED',
      });
      return;
    }

    try {
      const handler = this.handlers[method as CapabilityMethod];
      if (!handler) {
        throw new Error(`Handler not found: ${method}`);
      }

      // Execute the handler
      const result = await (handler as (params: unknown) => unknown | Promise<unknown>)(
        params ?? {}
      );
      this.sendResponse(id, result);
    } catch (error) {
      this.sendResponse(id, undefined, {
        message: error instanceof Error ? error.message : String(error),
        code: 'HANDLER_ERROR',
      });
    }
  }

  private handleEvent(event: RpcEvent): void {
    if (event.event === 'ready') {
      this.readyResolve?.();
    }
  }

  private sendResponse(
    id: string,
    result?: unknown,
    error?: { message: string; code?: string }
  ): void {
    if (this.destroyed || !this.iframe?.contentWindow) return;

    const response: RpcResponse = {
      type: 'response',
      id,
      result,
      error,
    };

    this.iframe.contentWindow.postMessage(response, '*');
  }

  private isAllowedMethod(method: string): method is CapabilityMethod {
    const allowedMethods: CapabilityMethod[] = [
      'esql.query',
      'panel.getSize',
      'render.setContent',
      'render.setError',
      'log.info',
      'log.warn',
      'log.error',
    ];
    return allowedMethods.includes(method as CapabilityMethod);
  }

  private handleTimeout(): void {
    if (this.destroyed) return;

    this.handleError(new Error('Script execution timeout'));
    this.showError('Script execution timed out');
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.onError?.(error);
  }

  private showError(message: string): void {
    if (this.iframe) {
      this.iframe.srcdoc = generateErrorSrcDoc(message);
    }
  }
}

/**
 * Factory function to create a bridge instance.
 */
export const createScriptPanelBridge = (options: BridgeOptions): ScriptPanelBridge => {
  return new ScriptPanelBridge(options);
};
