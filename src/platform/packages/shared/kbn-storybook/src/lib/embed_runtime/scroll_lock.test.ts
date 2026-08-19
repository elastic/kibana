/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isHostScrollLock, preventHostScrollLock } from './scroll_lock';

// Verbatim from `react-remove-scroll-bar`, which `EuiFocusTrap` mounts for `scrollLock`. A rename
// of its classes is harmless, but dropping the `body` rule would make this guard dead code.
const REMOVE_SCROLL_BAR_CSS = `
  .with-scroll-bars-hidden {
   overflow: hidden !important;
   padding-right: 11px !important;
  }
  body {
    overflow: hidden !important;
    overscroll-behavior: contain;
    position: relative !important;padding-right: 11px !important;
  }
  .right-scroll-bar-position { right: 11px !important; }
`;

// `EuiOverlayMask`'s `<Global>` styles, which reach the head only when a story renders without a
// shadow root and Emotion therefore falls back to the document cache.
const OVERLAY_MASK_CSS = 'body{overflow:hidden;};label:euiOverlayMaskBodyStyles;';

const makeStyle = (textContent: string) => ({ tagName: 'STYLE', textContent, disabled: false });

describe('isHostScrollLock', () => {
  it('matches the stylesheets that freeze the host page', () => {
    expect(isHostScrollLock(REMOVE_SCROLL_BAR_CSS)).toBe(true);
    expect(isHostScrollLock(OVERLAY_MASK_CSS)).toBe(true);
    expect(isHostScrollLock('html body { overflow: hidden }')).toBe(true);
    expect(isHostScrollLock('main, body { overflow : HIDDEN }')).toBe(true);
  });

  it('leaves unrelated stylesheets alone', () => {
    // Only `body` itself propagates overflow to the viewport, so narrower rules are not the leak.
    expect(isHostScrollLock('.somebody { overflow: hidden }')).toBe(false);
    expect(isHostScrollLock('.euiModal { overflow: hidden }')).toBe(false);
    expect(isHostScrollLock('body { overflow: auto }')).toBe(false);
    expect(isHostScrollLock('body { margin: 0 }')).toBe(false);
    expect(isHostScrollLock('')).toBe(false);
  });
});

describe('preventHostScrollLock', () => {
  const observe = jest.fn();
  let notify: MutationCallback | undefined;

  beforeEach(() => {
    observe.mockClear();
    notify = undefined;

    class FakeMutationObserver {
      constructor(callback: MutationCallback) {
        notify = callback;
      }
      public observe = observe;
    }

    Object.assign(global, {
      document: { head: { tagName: 'HEAD' } },
      MutationObserver: FakeMutationObserver,
    });
  });

  afterEach(() => {
    delete (global as { document?: unknown }).document;
    delete (global as { MutationObserver?: unknown }).MutationObserver;
  });

  const addToHead = (...nodes: unknown[]) =>
    notify?.([{ addedNodes: nodes } as unknown as MutationRecord], {} as MutationObserver);

  it('watches the head for stylesheets added after boot', () => {
    preventHostScrollLock();

    expect(observe).toHaveBeenCalledWith({ tagName: 'HEAD' }, { childList: true });
  });

  it('disables a scroll-locking stylesheet without touching the rest', () => {
    preventHostScrollLock();

    const scrollLock = makeStyle(REMOVE_SCROLL_BAR_CSS);
    const docsSiteStyle = makeStyle('body { font-family: sans-serif }');
    addToHead(scrollLock, docsSiteStyle);

    expect(scrollLock.disabled).toBe(true);
    expect(docsSiteStyle.disabled).toBe(false);
  });

  it('ignores non-stylesheet nodes', () => {
    preventHostScrollLock();

    const script = { tagName: 'SCRIPT', textContent: 'body { overflow: hidden }', disabled: false };
    addToHead(script);

    expect(script.disabled).toBe(false);
  });

  it('no-ops where MutationObserver is unavailable', () => {
    delete (global as { MutationObserver?: unknown }).MutationObserver;

    expect(() => preventHostScrollLock()).not.toThrow();
    expect(observe).not.toHaveBeenCalled();
  });
});
