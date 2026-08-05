/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { VegaSandboxMessage } from '@kbn/vega-sandbox';
import { VEGA_SANDBOX_ROUTE_PATH } from '../../common/sandbox_constants';

const SANDBOX_ATTRIBUTE = 'allow-scripts';
const DISALLOWED_SANDBOX_TOKENS = ['allow-same-origin', 'allow-top-navigation', 'allow-popups'];

export interface VegaSandboxFrameHost {
  destroy: () => void;
  iframe: HTMLIFrameElement;
  postMessage: (message: VegaSandboxMessage) => void;
}

export interface CreateVegaSandboxFrameHostParams {
  frameSrc: string;
  onMessage: (message: VegaSandboxMessage, event: MessageEvent) => void;
  parentEl: HTMLElement;
}

export const getVegaSandboxFrameSrc = (http: HttpStart): string =>
  http.basePath.prepend(VEGA_SANDBOX_ROUTE_PATH);

export const isVegaSandboxMessage = (value: unknown): value is VegaSandboxMessage =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { type?: unknown }).type === 'string';

const assertSandboxAttribute = (iframe: HTMLIFrameElement): void => {
  const sandbox = iframe.getAttribute('sandbox');
  const sandboxTokens = new Set(sandbox?.split(/\s+/).filter(Boolean));

  if (sandbox !== SANDBOX_ATTRIBUTE) {
    throw new Error(`Unexpected Vega sandbox iframe flags: ${sandbox ?? ''}`);
  }

  for (const token of DISALLOWED_SANDBOX_TOKENS) {
    if (sandboxTokens.has(token)) {
      throw new Error(`Vega sandbox iframe must not include ${token}`);
    }
  }
};

export const createVegaSandboxFrameHost = ({
  frameSrc,
  onMessage,
  parentEl,
}: CreateVegaSandboxFrameHostParams): VegaSandboxFrameHost => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', SANDBOX_ATTRIBUTE);
  iframe.setAttribute('src', frameSrc);
  iframe.setAttribute('title', 'Vega sandbox');
  iframe.style.border = '0';
  iframe.style.background = 'transparent';
  iframe.style.position = 'absolute';
  iframe.style.inset = '0';
  iframe.style.height = '100%';
  iframe.style.width = '100%';

  // Match the dashboard "custom content" panel iframe sizing pattern:
  // a positioned container with an absolutely-positioned iframe that fills it.
  parentEl.style.position = 'relative';
  parentEl.style.flex = '1 1 0%';
  parentEl.style.minWidth = '0';
  parentEl.style.minHeight = '0';

  assertSandboxAttribute(iframe);

  const messageHandler = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || !isVegaSandboxMessage(event.data)) {
      return;
    }

    onMessage(event.data, event);
  };

  window.addEventListener('message', messageHandler);
  parentEl.appendChild(iframe);

  return {
    iframe,
    destroy: () => {
      window.removeEventListener('message', messageHandler);
      iframe.remove();
    },
    postMessage: (message) => {
      // Sandboxed iframes have opaque origins, so parent-to-frame messages must target '*'.
      iframe.contentWindow?.postMessage(message, '*');
    },
  };
};
