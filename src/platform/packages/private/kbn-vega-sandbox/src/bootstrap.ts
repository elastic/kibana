/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { version as vegaVersion } from 'vega';
import { version as vegaLiteVersion } from 'vega-lite';
import { VegaSandboxErrorCode } from './common';
import {
  VEGA_SANDBOX_PROTOCOL_VERSION,
  type VegaSandboxInboundMessage,
  type VegaSandboxOutboundMessage,
} from './protocol';
import { createSandboxInspectorSession } from './inspector_session';
import { renderVegaDescriptor } from './render';
import type { VegaSandboxRenderController } from './types';

declare global {
  interface Window {
    __kbnVegaSandbox__?: {
      renderVegaDescriptor: typeof renderVegaDescriptor;
      versions: {
        vega: string;
        vegaLite: string;
      };
    };
  }
}

let controller: VegaSandboxRenderController | undefined;
let initialized = false;
let hrefInterceptorInstalled = false;
let pendingRestoreState: unknown | undefined;
let validateRequestCounter = 0;
const pendingExternalUrlValidations = new Map<
  string,
  {
    resolve: (value: { allowed: boolean; reason?: 'denied' | 'not_enabled' }) => void;
    reject: (reason?: unknown) => void;
  }
>();

const TOOLTIP_STYLE_ID = 'vega-kibana-sandbox-tooltip-styles';
const EXTERNAL_URL_VALIDATION_TIMEOUT_MS = 5_000;

const getRoot = (): HTMLElement => {
  const root = document.getElementById('vega-sandbox-root');

  if (!root) {
    throw new Error('Vega sandbox root element is missing.');
  }

  return root;
};

/** Inject parent-serialized EUI tooltip CSS (opaque iframe cannot see parent Emotion styles). */
const applyTooltipCss = (tooltipCss?: string): void => {
  if (!tooltipCss) {
    return;
  }

  let style = document.getElementById(TOOLTIP_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = TOOLTIP_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = tooltipCss;
};

const postToParent = (message: VegaSandboxOutboundMessage): void => {
  window.parent.postMessage(message, '*');
};

const inspectorSession = createSandboxInspectorSession({
  getView: () => controller?.view,
  postToParent,
});

const requestValidateExternalUrl = (
  uri: string
): Promise<{ allowed: boolean; reason?: 'denied' | 'not_enabled' }> => {
  const requestId = `exturl-${++validateRequestCounter}`;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingExternalUrlValidations.delete(requestId);
      reject(new Error('Timed out validating external URL with the Kibana parent.'));
    }, EXTERNAL_URL_VALIDATION_TIMEOUT_MS);

    pendingExternalUrlValidations.set(requestId, {
      resolve: (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      reject: (reason) => {
        window.clearTimeout(timeout);
        reject(reason);
      },
    });

    postToParent({ type: 'validateExternalUrl', requestId, uri });
  });
};

const handleValidateExternalUrlResult = (
  message: Extract<VegaSandboxInboundMessage, { type: 'validateExternalUrlResult' }>
): void => {
  const pending = pendingExternalUrlValidations.get(message.requestId);
  if (!pending) {
    return;
  }
  pendingExternalUrlValidations.delete(message.requestId);
  pending.resolve({ allowed: message.allowed, reason: message.reason });
};

const installHrefInterceptor = (): void => {
  if (hrefInterceptorInstalled) return;
  hrefInterceptorInstalled = true;

  const originalOpen = window.open;
  window.open = ((url?: string | URL, _target?: string, _features?: string) => {
    const href = typeof url === 'string' ? url : url instanceof URL ? url.toString() : undefined;
    if (href) {
      postToParent({ type: 'openHref', href });
    }
    // The sandbox disallows top navigation/popups, so we never attempt to open directly.
    return null;
  }) as typeof window.open;

  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const href = this.getAttribute('href') ?? this.href;
    if (href) {
      postToParent({ type: 'openHref', href });
      return;
    }
    return originalAnchorClick.call(this);
  };

  // Vega's View.handleHref creates a detached <a> and calls dispatchEvent(click), not click()
  // or window.open. Intercept that path so href marks still reach the parent.
  const originalDispatchEvent = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (event: Event): boolean {
    const href = this.getAttribute('href') ?? this.href;
    if (href && event.type === 'click') {
      postToParent({ type: 'openHref', href });
      return false;
    }
    return originalDispatchEvent.call(this, event);
  };

  // Keep a reference so bundlers don't elide it; also helps debugging.
  void originalOpen;
};

const isInboundMessage = (value: unknown): value is VegaSandboxInboundMessage =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { type?: unknown }).type === 'string';

const handleInit = ({
  protocolVersion,
  colorMode,
  tooltipCss,
}: Extract<VegaSandboxInboundMessage, { type: 'init' }>): void => {
  if (protocolVersion !== VEGA_SANDBOX_PROTOCOL_VERSION) {
    postToParent({
      type: 'error',
      error: {
        code: VegaSandboxErrorCode.UnsupportedProtocolVersion,
        values: {
          expected: VEGA_SANDBOX_PROTOCOL_VERSION,
          received: protocolVersion,
        },
      },
    });
    return;
  }

  if (colorMode) {
    document.documentElement.style.colorScheme = colorMode === 'DARK' ? 'dark' : 'light';
  }

  applyTooltipCss(tooltipCss);
  installHrefInterceptor();
  initialized = true;
};

const OMIT_RESTORE_SIGNALS = ['width', 'height', 'padding', 'autosize', 'background'] as const;

const toRestorableState = (state: unknown): unknown => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return undefined;
  }
  const record = state as { data?: unknown; signals?: unknown };
  const signals =
    record.signals && typeof record.signals === 'object' && !Array.isArray(record.signals)
      ? Object.fromEntries(
          Object.entries(record.signals as Record<string, unknown>).filter(
            ([name]) =>
              !OMIT_RESTORE_SIGNALS.includes(name as (typeof OMIT_RESTORE_SIGNALS)[number])
          )
        )
      : undefined;
  return { signals };
};

const handleRender = async (message: Extract<VegaSandboxInboundMessage, { type: 'render' }>) => {
  if (!initialized) {
    return;
  }

  const { renderId, descriptor } = message;
  let capturedState: unknown;
  if (controller?.view) {
    const state = controller.view.getState();
    if (state) {
      capturedState = state;
      postToParent({ type: 'saveState', state });
    }
  }
  inspectorSession.onViewWillDestroy();
  controller?.destroy();
  controller = undefined;
  const root = getRoot();
  root.replaceChildren();

  const container = document.createElement('div');
  const controls = document.createElement('div');
  container.style.height = '100%';
  container.style.width = '100%';
  container.style.flex = '1 1 auto';
  container.style.minHeight = '0';
  container.style.minWidth = '0';
  controls.style.flex = '0 0 auto';
  root.append(container, controls);

  controller = await renderVegaDescriptor({
    container,
    controls,
    descriptor,
    onError: (error) => postToParent({ type: 'error', renderId, error }),
    onFunction: (intent) => postToParent({ type: 'applyFilter', intent }),
    onValidateExternalUrl: requestValidateExternalUrl,
    onWarn: (warning) => postToParent({ type: 'warn', warning }),
  });

  const restoreFromCapture =
    Boolean(descriptor.restoreSignalValuesOnRefresh) && capturedState !== undefined;
  const stateToRestore = restoreFromCapture
    ? toRestorableState(capturedState)
    : pendingRestoreState;
  pendingRestoreState = undefined;

  if (stateToRestore !== undefined && controller?.view) {
    await controller.view.setState(stateToRestore as never);
  }

  if (message.dimensions) {
    await controller.resize(message.dimensions);
  }

  inspectorSession.onViewChanged();
  postToParent({ type: 'rendered', renderId });
};

const handleRestoreState = async (state: unknown): Promise<void> => {
  if (!initialized || !state) {
    return;
  }
  if (!controller?.view) {
    pendingRestoreState = state;
    return;
  }
  await controller.view.setState(state as any);
};

const handleMessage = (message: MessageEvent): void => {
  if (!isInboundMessage(message.data)) {
    return;
  }

  switch (message.data.type) {
    case 'init':
      handleInit(message.data);
      return;
    case 'render':
      handleRender(message.data).catch((error) => {
        const messageText = error instanceof Error ? error.message : String(error);
        // Loader already posted ExternalUrl* errors before rejecting sanitize.
        if (
          messageText === VegaSandboxErrorCode.ExternalUrlDenied ||
          messageText === VegaSandboxErrorCode.ExternalUrlsNotEnabled
        ) {
          return;
        }
        postToParent({
          type: 'error',
          renderId: message.data.renderId,
          error: {
            code: VegaSandboxErrorCode.RenderFailed,
            values: { message: messageText },
          },
        });
      });
      return;
    case 'resize':
      controller?.resize(message.data.dimensions);
      return;
    case 'restoreState':
      handleRestoreState(message.data.state).catch((error) => {
        postToParent({
          type: 'error',
          error: {
            code: VegaSandboxErrorCode.RenderFailed,
            values: { message: error instanceof Error ? error.message : String(error) },
          },
        });
      });
      return;
    case 'validateExternalUrlResult':
      handleValidateExternalUrlResult(message.data);
      return;
    case 'requestInspectorSnapshot':
      inspectorSession.handleRequestSnapshot(message.data);
      return;
    case 'setInspectorActive':
      inspectorSession.handleSetInspectorActive(message.data);
      return;
  }
};

window.addEventListener('message', handleMessage);

window.__kbnVegaSandbox__ = {
  renderVegaDescriptor,
  versions: {
    vega: vegaVersion,
    vegaLite: vegaLiteVersion,
  },
};
