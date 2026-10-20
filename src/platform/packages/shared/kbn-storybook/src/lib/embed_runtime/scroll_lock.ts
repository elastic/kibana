/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Anchored on the selector so rules for classes that merely end in `body` (`.somebody`) do not
// qualify, and `html body` still does.
const HOST_SCROLL_LOCK = /(?:^|[\s,>+~])body\s*\{[^}]*overflow\s*:\s*hidden/i;

/** True when `css` would freeze scrolling on the page hosting the embeds. */
export const isHostScrollLock = (css: string): boolean => HOST_SCROLL_LOCK.test(css);

const disableHostScrollLock = (node: Node): void => {
  const style = node as HTMLStyleElement;

  if (style.tagName !== 'STYLE' || !isHostScrollLock(style.textContent ?? '')) {
    return;
  }

  style.disabled = true;
};

/**
 * Focus-trapping EUI overlays lock scrolling through `EuiFocusTrap`, which has
 * `react-remove-scroll-bar` append a stylesheet to `document.head` setting
 * `body { overflow: hidden !important }`. The shadow root cannot contain it, and `EuiModal`
 * hardcodes `scrollLock` after spreading `focusTrapProps`, so a story opening a modal would
 * otherwise freeze the docs page around it.
 *
 * Disabling the whole sheet is safe: every rule in it compensates for a scrollbar that stays
 * visible here. Matching the declaration rather than the library's class name avoids depending on
 * a transitive package, and only sheets added after boot are inspected, so the docs site's own
 * styles are never touched.
 */
export const preventHostScrollLock = (): void => {
  if (
    typeof MutationObserver === 'undefined' ||
    typeof document === 'undefined' ||
    !document.head
  ) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => addedNodes.forEach(disableHostScrollLock));
  });

  observer.observe(document.head, { childList: true });
};
