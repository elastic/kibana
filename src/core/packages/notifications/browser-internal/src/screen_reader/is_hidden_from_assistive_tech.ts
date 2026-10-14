/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const hasOpenNativeModal = (): boolean => {
  try {
    return document.querySelector('dialog:modal') !== null;
  } catch {
    // jsdom doesn't support `:modal`
    return false;
  }
};

/**
 * Whether an element is hidden from all screen readers, which ignore hidden live regions and don't
 * replay updates made while they were hidden. That's the case when:
 * - it or an ancestor has `aria-hidden="true"` or `inert`, e.g. set by a focus trap isolating its content
 * - a native `<dialog>` opened with `showModal()` makes the rest of the page inert
 *
 * Elements with `aria-modal="true"` (EuiModal, EuiFlyout, EuiPopover with `ownFocus`) don't count.
 * JAWS, NVDA and Narrator still read live regions outside them, and only VoiceOver ignores them
 * (https://github.com/w3c/aria/issues/1854), so waiting for them to close would only delay announcements.
 */
export const isHiddenFromAssistiveTech = (element: HTMLElement | null): boolean =>
  Boolean(element?.closest('[aria-hidden="true"], [inert]')) || hasOpenNativeModal();
