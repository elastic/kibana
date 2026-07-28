/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createVegaSandboxFrameHost } from './vega_sandbox_frame_host';

const dispatchFrameMessage = (source: Window | null, data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
};

describe('createVegaSandboxFrameHost', () => {
  let parentEl: HTMLElement;

  beforeEach(() => {
    parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
  });

  afterEach(() => {
    parentEl.remove();
  });

  test('creates an opaque-origin sandbox iframe', () => {
    const host = createVegaSandboxFrameHost({
      frameSrc: '/internal/vis_type_vega/sandbox',
      onMessage: jest.fn(),
      parentEl,
    });

    expect(host.iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(host.iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(host.iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(host.iframe.getAttribute('sandbox')).not.toContain('allow-popups');
    expect(host.iframe.getAttribute('src')).toBe('/internal/vis_type_vega/sandbox');
    expect(parentEl.querySelector('iframe')).toBe(host.iframe);

    host.destroy();
  });

  test('forwards well-formed messages from its own frame', () => {
    const onMessage = jest.fn();
    const host = createVegaSandboxFrameHost({
      frameSrc: '/internal/vis_type_vega/sandbox',
      onMessage,
      parentEl,
    });

    dispatchFrameMessage(host.iframe.contentWindow, { type: 'rendered' });

    expect(onMessage).toHaveBeenCalledWith(
      { type: 'rendered' },
      expect.objectContaining({ data: { type: 'rendered' } })
    );

    host.destroy();
  });

  test('ignores malformed messages and messages from other frames', () => {
    const onMessage = jest.fn();
    const host = createVegaSandboxFrameHost({
      frameSrc: '/internal/vis_type_vega/sandbox',
      onMessage,
      parentEl,
    });

    dispatchFrameMessage(host.iframe.contentWindow, null);
    dispatchFrameMessage(host.iframe.contentWindow, { missingType: true });
    dispatchFrameMessage(window, { type: 'rendered' });

    expect(onMessage).not.toHaveBeenCalled();

    host.destroy();
  });

  test('destroy removes the iframe and message listener', () => {
    const onMessage = jest.fn();
    const host = createVegaSandboxFrameHost({
      frameSrc: '/internal/vis_type_vega/sandbox',
      onMessage,
      parentEl,
    });
    const contentWindow = host.iframe.contentWindow;

    host.destroy();
    dispatchFrameMessage(contentWindow, { type: 'rendered' });

    expect(parentEl.querySelector('iframe')).toBeNull();
    expect(onMessage).not.toHaveBeenCalled();
  });
});
