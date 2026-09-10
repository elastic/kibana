/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shared with the embeddable panel hover actions (which render the button) so focus can
// return to the panel's context menu toggle when a flyout opened from the panel closes.
export const getPanelContextMenuTriggerId = (panelId: string) =>
  `presentationPanelContextMenu-${panelId}`;

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]';

const getFirstFocusable = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  if (el.matches(FOCUSABLE_SELECTOR)) return el;
  return el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
};

const focusPreservingVisibility = (el: HTMLElement) => {
  const previousInlineVisibility = el.style.visibility;
  // `visibility: visible` on the element overrides an inherited `hidden` (e.g. from the
  // hover-actions toolbar), so focus can land without revealing the whole toolbar.
  el.style.visibility = 'visible';

  el.focus();

  const restore = () => {
    el.removeEventListener('focusout', restore);
    el.style.visibility = previousInlineVisibility;
  };

  // No focusout will fire if focus didn't land (e.g. disabled/detached), so restore now.
  if (document.activeElement !== el) {
    restore();
    return;
  }

  el.addEventListener('focusout', restore);
};

export const focusFirstFocusable = (target: Element | null | (() => Element | null)) => {
  setTimeout(() => {
    const el = typeof target === 'function' ? target() : target;
    if (!el) return;
    if (el.contains(document.activeElement)) {
      // don't steal focus if it's already inside the target (set by the target's own content)
      return;
    }
    const focusable = getFirstFocusable(el as HTMLElement);
    if (focusable) focusPreservingVisibility(focusable);
  });
};
