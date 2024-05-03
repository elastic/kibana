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
const leftRightLocalStorage = 'leftRightResizedWidths.';

export interface InternalPercentages {
  /**
   * Percentage of the left section (added with the right section should make 100%)
   */
  left: number;
  /**
   * Percentage of the right section (added with the left section should make 100%)
   */
  right: number;
}

export interface UseInternalPercentagesParams {
  /**
   * Width of the right section in pixels
   */
  defaultRightSectionWidth: number;
  /**
   * Width of the left section in pixels
   */
  defaultLeftSectionWidth: number;
}

export interface UseInternalPercentagesResult {
  /**
   * Percentages for the left and right sections. The sum of the 2 will always make 100%
   */
  percentages: InternalPercentages;
  /**
   * Set the percentages and save them to local storage
   */
  setPercentages: (p: InternalPercentages) => void;
  /**
   * Reset the percentages to the default values and delete the local storage entry
   */
  resetPercentages: () => void;
}

/**
 * Custom useState hook, to read from and save to localStorage the internal left and right width as percentage.
 * This hook is directly used by the EuiResizableContainer component.
 */
export const useInternalPercentages = ({
  defaultRightSectionWidth,
  defaultLeftSectionWidth,
}: UseInternalPercentagesParams): UseInternalPercentagesResult => {
  const { urlKey } = useExpandableFlyoutContext();
  const localStorageKey = useMemo(
    () => `${expandableFlyoutLocalStorageKey}${leftRightLocalStorage}${urlKey}`,
    [urlKey]
  );

  const storedWidthPercentages = localStorage.getItem(localStorageKey);

  // calculate the default percentages, based on the window width
  const defaultPercentages: InternalPercentages = useMemo(
    () => ({
      left: (defaultLeftSectionWidth / (defaultLeftSectionWidth + defaultRightSectionWidth)) * 100,
      right:
        (defaultRightSectionWidth / (defaultLeftSectionWidth + defaultRightSectionWidth)) * 100,
    }),
    [defaultLeftSectionWidth, defaultRightSectionWidth]
  );

  // if a value was saved in local storage, use it, otherwise use the default percentages
  const initialWidthPercentages: InternalPercentages = storedWidthPercentages
    ? JSON.parse(storedWidthPercentages)
    : defaultPercentages;

  const [percentages, setPercentages] = useState<InternalPercentages>(initialWidthPercentages);

  // customer setter that sets the percentages and saves them to local storage
  const customSetPercentages = useCallback(
    (p?: InternalPercentages) => {
      if (p) {
        setPercentages(p);
        localStorage.setItem(localStorageKey, JSON.stringify(p));
      } else {
        setPercentages(defaultPercentages);
        localStorage.removeItem(localStorageKey);
      }
    },
    [defaultPercentages, localStorageKey]
  );

  // reset the percentages to the default values and delete the local storage entry
  const resetPercentages = useCallback(() => {
    customSetPercentages();
  }, [customSetPercentages]);

  return { percentages, setPercentages: customSetPercentages, resetPercentages };
};
