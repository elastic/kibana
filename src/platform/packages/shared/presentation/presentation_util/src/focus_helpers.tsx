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
