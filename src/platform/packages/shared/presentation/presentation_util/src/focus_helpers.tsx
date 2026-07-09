/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stable DOM id for a panel's context menu ("...") toggle button. Shared between the
 * embeddable panel hover actions (which render the button) and `openLazyFlyout` (which
 * restores focus to it) so focus can return to the persistent toggle when a flyout
 * opened from the panel closes — even if the action ran asynchronously and the context
 * menu (and the transient menu item that had focus) was already torn down (WCAG 2.4.3
 * Focus Order).
 */
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
  // `visibility: visible` on the element overrides an inherited `visibility: hidden`
  // from an ancestor (e.g. the hover-actions toolbar), so the programmatic focus lands
  // without revealing the whole toolbar. Keyboard users still get the CSS
  // `:focus-visible` reveal while the element stays focused.
  el.style.visibility = 'visible';

  el.focus();

  const restore = () => {
    el.removeEventListener('focusout', restore);
    el.style.visibility = previousInlineVisibility;
  };

  if (document.activeElement !== el) {
    // The focus did not land (e.g. the element is disabled or was detached), so no
    // `focusout` will ever fire. Restore the overridden visibility immediately to
    // avoid leaving the element permanently overridden.
    restore();
    return;
  }

  // Restore the original visibility once focus leaves the element.
  el.addEventListener('focusout', restore);
};

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
