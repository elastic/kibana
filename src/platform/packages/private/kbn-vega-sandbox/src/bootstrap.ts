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

const isInboundMessage = (value: unknown): value is VegaSandboxInboundMessage =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { type?: unknown }).type === 'string';

const handleInit = ({ protocolVersion }: { protocolVersion: number }): void => {
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

  initialized = true;
};

const handleRender = async (message: Extract<VegaSandboxInboundMessage, { type: 'render' }>) => {
  if (!initialized) {
    return;
  }

  controller?.destroy();
  const root = getRoot();
  root.replaceChildren();

  const container = document.createElement('div');
  const controls = document.createElement('div');
  container.style.height = '100%';
  container.style.width = '100%';
  root.append(container, controls);

  controller = await renderVegaDescriptor({
    container,
    controls,
    descriptor: message.descriptor,
    onError: (error) => postToParent({ type: 'error', error }),
    onFunction: (intent) => postToParent({ type: 'applyFilter', intent }),
    onWarn: (warning) => postToParent({ type: 'warn', warning }),
  });

  if (message.dimensions) {
    await controller.resize(message.dimensions);
  }

  postToParent({ type: 'rendered' });
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
