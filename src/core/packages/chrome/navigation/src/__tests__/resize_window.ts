/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act } from '@testing-library/react';

/**
 * Mocks the window's dimensions and dispatches a resize event.
 *
 * @param width The new window width
 * @param height The new window height
 * @returns A cleanup function to restore the original dimensions.
 */
export const resizeWindow = (width: number, height: number) => {
  if (typeof window === 'undefined') return;

  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  // Set the new values
  window.innerWidth = width;
  window.innerHeight = height;

  // Dispatch the resize event
  act(() => window.dispatchEvent(new Event('resize')));

  // Return a cleanup function
  return () => {
    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };
};
