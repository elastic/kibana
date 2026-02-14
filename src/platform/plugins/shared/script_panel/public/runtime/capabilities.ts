/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CapabilityHandlers } from './bridge';
import type { EsqlExecutor } from './esql_executor';
import type { LogEntry, PanelSize } from './types';

export interface CapabilitiesOptions {
  /** ES|QL executor instance */
  esqlExecutor: EsqlExecutor;
  /** Function to get the current panel size */
  getPanelSize: () => PanelSize;
  /** Function to set the rendered content */
  setContent: (html: string) => void;
  /** Function to set an error state */
  setError: (message: string) => void;
  /** Callback for captured logs */
  onLog?: (entry: LogEntry) => void;
}

/**
 * Creates the capability handlers that are exposed to the sandboxed iframe.
 * These handlers implement the host side of the RPC bridge.
 */
export const createCapabilityHandlers = (options: CapabilitiesOptions): CapabilityHandlers => {
  const { esqlExecutor, getPanelSize, setContent, setError, onLog } = options;

  // Create log handler factory
  const createLogHandler = (level: LogEntry['level']) => {
    return (params: { args: unknown[] }): void => {
      const entry: LogEntry = {
        level,
        message: params.args.map(stringifyArg).join(' '),
        timestamp: Date.now(),
        args: params.args,
      };
      onLog?.(entry);

      // Also log to console for debugging (prefixed)
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      // eslint-disable-next-line no-console
      console[consoleMethod](`[ScriptPanel]`, ...params.args);
    };
  };

  return {
    /**
     * Execute an ES|QL query.
     * This is the primary data access method for scripts.
     */
    'esql.query': async (params) => {
      return esqlExecutor.query(params);
    },

    /**
     * Get the current panel dimensions.
     */
    'panel.getSize': async () => {
      return getPanelSize();
    },

    /**
     * Set the panel's rendered HTML content.
     * Content is sanitized before rendering.
     */
    'render.setContent': async (params) => {
      const { html } = params;

      // Basic validation
      if (typeof html !== 'string') {
        throw new Error('Content must be a string');
      }

      // Apply size limit (1MB)
      const maxSize = 1024 * 1024;
      if (html.length > maxSize) {
        throw new Error(`Content exceeds maximum size of ${maxSize} bytes`);
      }

      setContent(html);
    },

    /**
     * Display an error message in the panel.
     */
    'render.setError': async (params) => {
      const { message } = params;
      setError(String(message));
    },

    /**
     * Log info message (captured by host).
     */
    'log.info': createLogHandler('info'),

    /**
     * Log warning message (captured by host).
     */
    'log.warn': createLogHandler('warn'),

    /**
     * Log error message (captured by host).
     */
    'log.error': createLogHandler('error'),
  };
};

/**
 * Stringify an argument for logging.
 */
const stringifyArg = (arg: unknown): string => {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;

  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
};

/**
 * Interface for managing panel capabilities lifecycle.
 */
export interface PanelCapabilities {
  handlers: CapabilityHandlers;
  destroy: () => void;
}

/**
 * Factory to create panel capabilities with proper lifecycle management.
 */
export const createPanelCapabilities = (options: CapabilitiesOptions): PanelCapabilities => {
  const handlers = createCapabilityHandlers(options);

  return {
    handlers,
    destroy: () => {
      options.esqlExecutor.destroy();
    },
  };
};
