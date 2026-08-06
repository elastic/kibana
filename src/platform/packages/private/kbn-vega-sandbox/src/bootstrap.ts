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

const getRoot = (): HTMLElement => {
  const root = document.getElementById('vega-sandbox-root');

  if (!root) {
    throw new Error('Vega sandbox root element is missing.');
  }

  return root;
};

const postToParent = (message: VegaSandboxOutboundMessage): void => {
  window.parent.postMessage(message, '*');
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

  installHrefInterceptor();
  initialized = true;
};

const handleRender = async (message: Extract<VegaSandboxInboundMessage, { type: 'render' }>) => {
  if (!initialized) {
    return;
  }

  if (controller?.view) {
    const state = controller.view.getState();
    if (state) {
      postToParent({ type: 'saveState', state });
    }
  }
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
    descriptor: message.descriptor,
    onError: (error) => postToParent({ type: 'error', error }),
    onFunction: (intent) => postToParent({ type: 'applyFilter', intent }),
    onWarn: (warning) => postToParent({ type: 'warn', warning }),
  });

  if (pendingRestoreState !== undefined && controller?.view) {
    await controller.view.setState(pendingRestoreState as any);
    pendingRestoreState = undefined;
  }

  if (message.dimensions) {
    await controller.resize(message.dimensions);
  }

  postToParent({ type: 'rendered' });
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
        postToParent({
          type: 'error',
          error: {
            code: VegaSandboxErrorCode.RenderFailed,
            values: { message: error instanceof Error ? error.message : String(error) },
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
