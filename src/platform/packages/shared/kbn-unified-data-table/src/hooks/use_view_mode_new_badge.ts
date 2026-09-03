/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

export const VIEW_MODE_NEW_BADGE_STORAGE_KEY = 'unifiedDataTable:hasSeenViewModeNewBadge';

export interface UseViewModeNewBadgeResult {
  isNew: boolean;
  markAsSeen: () => void;
}

/**
 * Tracks whether the user has already seen the "New" indicator for the data table view mode.
 */
export const useViewModeNewBadge = (
  storage: Storage,
  isFeatureAvailable: boolean
): UseViewModeNewBadgeResult => {
  const [hasSeen, setHasSeen] = useState<boolean>(
    () => storage.get(VIEW_MODE_NEW_BADGE_STORAGE_KEY) === true
  );

  const markAsSeen = useCallback(() => {
    setHasSeen((prev) => {
      if (prev) {
        return prev;
      }
      storage.set(VIEW_MODE_NEW_BADGE_STORAGE_KEY, true);
      return true;
    });
  }, [storage]);

  return { isNew: isFeatureAvailable && !hasSeen, markAsSeen };
};
