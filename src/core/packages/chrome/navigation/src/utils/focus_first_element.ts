/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

import { getFocusableElements } from './get_focusable_elements';

/**
 * Utility function for focusing the first interactive element.
 *
 * @param ref - The ref to the container element.
 */
export const focusFirstElement = (ref: RefObject<HTMLElement>) => {
  const container = ref?.current;
  if (!container) return;

  const elements = getFocusableElements(container);

  if (elements.length > 0) {
    elements[0].focus();
  }
};
