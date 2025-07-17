/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefObject } from 'react';

import { getFocusableElements } from './get_focusable_elements';

/**
 * Utility function for focus trap functionality
 */
export const trapFocus = (ref: RefObject<HTMLElement>) => (e: KeyboardEvent) => {
  const elements = getFocusableElements(ref);

  if (!ref.current || e.key !== 'Tab') return;
  if (!ref.current.contains(document.activeElement)) return;
  if (!elements.length) return;

  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
};
