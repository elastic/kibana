/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutContext } from '../context';

const expandableFlyoutLocalStorageKey = 'expandableFlyout.';
const collapsedLocalStorage = 'collapsedResizedWidth.';
const expandedLocalStorage = 'expandedResizedWidth.';

export interface UseResizedWidthParams {
  /**
   * To apply the resized width to the collapsed or expanded mode
   */
  mode: 'collapsed' | 'expanded';
}

export interface UseResizedWidthResult {
  /**
   * The stored width
   */
  width: number | undefined;
  /**
   * Set the width and save it to local storage
   */
  setWidth: (w: number | undefined) => void;
  /**
   * Reset the width
   */
  resetWidth: () => void;
}

/**
 * Custom useState hook, to read from and save to localStorage the user resized width.
 * This hook is used for both the collapsed and expanded modes.
 */
export const useResizedWidth = ({ mode }: UseResizedWidthParams): UseResizedWidthResult => {
  const { urlKey } = useExpandableFlyoutContext();
  const localStorageKey = useMemo(
    () =>
      mode === 'collapsed'
        ? `${expandableFlyoutLocalStorageKey}${collapsedLocalStorage}${urlKey}`
        : `${expandableFlyoutLocalStorageKey}${expandedLocalStorage}${urlKey}`,
    [mode, urlKey]
  );

  // if the value is stored in the local storage, we use it as initial value
  const storedWidth = localStorage.getItem(localStorageKey);
  const initialWidth = storedWidth ? parseFloat(storedWidth) : undefined;

  const [width, setWidth] = useState<number | undefined>(initialWidth);

  // custom setter that sets the width and saves it to local storage
  const customSetWidth = useCallback(
    (w: number | undefined) => {
      if (w) {
        setWidth(w);
        localStorage.setItem(localStorageKey, w.toString());
      } else {
        setWidth(undefined);
        localStorage.removeItem(localStorageKey);
      }
    },
    [localStorageKey]
  );

  // reset the width to undefined and remove the local storage entry
  const resetWidth = useCallback(() => customSetWidth(undefined), [customSetWidth]);

  return { width, setWidth: customSetWidth, resetWidth };
};
