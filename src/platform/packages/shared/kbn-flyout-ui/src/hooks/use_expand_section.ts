/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { getExpandedSectionFromLocalStorage } from '../utils/local_storage';

export interface UseExpandSectionParams {
  /**
   * Default value for the section
   */
  defaultValue: boolean;
  /**
   * StorageKey to save value in specific flyout
   */
  storageKey: string;
  /**
   * Title of the section
   */
  title: string;
}

/**
 * Hook to get the expanded state of a section from local storage.
 */
export const useExpandSection = ({
  storageKey,
  title,
  defaultValue,
}: UseExpandSectionParams): boolean => {
  return useMemo(() => {
    const localStorage = getExpandedSectionFromLocalStorage(storageKey);
    const key = title.toLowerCase();
    return localStorage[key] !== undefined ? localStorage[key] : defaultValue;
  }, [storageKey, title, defaultValue]);
};
