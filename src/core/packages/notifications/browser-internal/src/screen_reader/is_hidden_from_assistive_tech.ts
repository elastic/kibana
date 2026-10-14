/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Checks whether an element is hidden from assistive technologies.
 *
 * Live-region updates made while hidden are generally not announced
 * or reliably replayed when the region becomes visible.
 *
 * An element is considered hidden when:
 * - It or an ancestor has `aria-hidden="true"` or `inert`.
 * - It is outside a native `<dialog>` opened with `showModal()`,
 *   which makes the rest of the document inert.
 *
 * `aria-modal="true"` alone is not treated as hiding background content.
 * JAWS, NVDA, and Narrator can still announce live regions outside ARIA
 * modals, while VoiceOver may suppress them.
 *
 * See https://github.com/w3c/aria/issues/1854
 */
export const isHiddenFromAssistiveTech = (element: HTMLElement | null): boolean => {
  if (!element) return false;

  if (element.closest('[aria-hidden="true"], [inert]')) {
    return true;
  }

  const modal = document.querySelector<HTMLDialogElement>('dialog:modal');

  return modal !== null && !modal.contains(element);
};
