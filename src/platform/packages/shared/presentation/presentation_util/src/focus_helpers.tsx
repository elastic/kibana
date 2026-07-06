/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const getFirstFocusable = (el: HTMLElement | null): { focus: () => void } | null => {
  const selector = 'button, [href], input, select, textarea, [tabindex]';
  if (!el) return null;
  if (el.matches(selector)) return el;
  return el.querySelector(selector) as HTMLElement | null;
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
    if (!el.contains(document.activeElement)) {
      // only focus the first element of the target if the currently focused element is not
      // a descendant of it (ie. the focus was not already set by the target's own content)
      getFirstFocusable(el as HTMLElement)?.focus();
    }
  });
};
