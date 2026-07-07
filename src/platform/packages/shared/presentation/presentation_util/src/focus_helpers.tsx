/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]';

const getFirstFocusable = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  if (el.matches(FOCUSABLE_SELECTOR)) return el;
  return el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
};

/**
 * Focuses `el`, working around `visibility: hidden` ancestors.
 *
 * Some triggers (notably dashboard panel hover actions) are hidden with
 * `visibility: hidden` to keep them out of the tab order until the panel is
 * hovered or a descendant is focused. Calling `.focus()` on an element inside a
 * `visibility: hidden` subtree is a no-op, so returning focus to such a trigger
 * would silently drop focus to `<body>` (violating WCAG 2.4.3 Focus Order).
 *
 * To make the focus land we temporarily override `visibility` inline on the
 * element and any hidden ancestor, focus it, and restore the original inline
 * value once focus leaves. Only `visibility` is overridden (not `opacity`), so
 * the element becomes focusable without being forced into view: keyboard users
 * keep the CSS-driven `:focus-visible` reveal, while mouse interactions do not
 * leave the actions visually pinned open.
 */
const focusPreservingVisibility = (el: HTMLElement) => {
  const overridden: Array<{ node: HTMLElement; previousInlineVisibility: string }> = [];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (window.getComputedStyle(node).visibility === 'hidden') {
      overridden.push({ node, previousInlineVisibility: node.style.visibility });
      node.style.visibility = 'visible';
    }
  }

  el.focus();

  if (overridden.length === 0) return;

  const restore = () => {
    el.removeEventListener('focusout', restore);
    for (const { node, previousInlineVisibility } of overridden) {
      node.style.visibility = previousInlineVisibility;
    }
  };
  // Restore the original visibility once focus leaves the element. While it stays
  // focused, keyboard users keep it revealed via the CSS `:focus-visible` rules.
  el.addEventListener('focusout', restore);
};

/**
 * Focuses the first focusable element of `target` on the next tick.
 *
 * `target` may be an element or a function that resolves one. The resolver form
 * is important when the target may be (re)rendered between the time focus is
 * requested and the deferred focus runs: the element is looked up inside the
 * `setTimeout`, so a node replaced by a re-render is resolved to its fresh
 * instance rather than a stale, detached node.
 */
export const focusFirstFocusable = (target: Element | null | (() => Element | null)) => {
  setTimeout(() => {
    const el = typeof target === 'function' ? target() : target;
    if (!el) return;
    if (el.contains(document.activeElement)) {
      // only focus the first element of the target if the currently focused element is not
      // a descendant of it (ie. the focus was not already set by the target's own content)
      return;
    }
    const focusable = getFirstFocusable(el as HTMLElement);
    if (focusable) focusPreservingVisibility(focusable);
  });
};
