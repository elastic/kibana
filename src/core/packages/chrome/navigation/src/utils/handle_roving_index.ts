/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEventHandler } from 'react';
import { getFocusableElements } from './get_focusable_elements';

/**
 * Handles the roving index for a given element.
 *
 * @param ref - the ref to the element to handle the roving index.
 */
export const handleRovingIndex: KeyboardEventHandler<HTMLDivElement> = (e) => {
  e.stopPropagation();

  const container = e.currentTarget;

  const elements = getFocusableElements(container);
  const currentIndex = elements.findIndex((el) => el === document.activeElement);

  let nextIndex = currentIndex;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      nextIndex = (currentIndex + 1) % elements.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      nextIndex = (currentIndex - 1 + elements.length) % elements.length;
      break;
    case 'Home':
      e.preventDefault();
      nextIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      nextIndex = elements.length - 1;
      break;
    default:
      return;
  }

  elements[nextIndex]?.focus();
};
