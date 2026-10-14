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
 * Screen readers ignore content hidden from the accessibility tree, live regions included,
 * and don't replay updates made while it was hidden. An element is hidden when:
 * - it or an ancestor has `aria-hidden="true"` or `inert`, e.g. set by a focus trap isolating its content
 * - a modal is open: EuiModal, EuiConfirmModal, overlay EuiFlyout and EuiPopover with `ownFocus`
 *   set `aria-modal="true"`, and native `<dialog>`s opened with `showModal()` match `:modal`
 */
export const isHiddenFromAssistiveTech = (element: HTMLElement | null): boolean =>
  Boolean(element?.closest('[aria-hidden="true"], [inert]')) ||
  document.querySelector('[aria-modal="true"]') !== null ||
  hasOpenNativeModal();
