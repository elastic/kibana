/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useState, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { UnifiedFieldListSidebarContainerStateService } from '../types';

/**
 * Hook params
 */
export interface UseSidebarToggleParams {
  /**
   * Service for managing the state
   */
  stateService: UnifiedFieldListSidebarContainerStateService;
}

/**
 * Hook result type
 */
export interface UseSidebarToggleResult {
  isSidebarCollapsed: boolean;
  onToggleSidebar: (isSidebarCollapsed: boolean) => void;
}

/**
 * Hook for managing sidebar toggle state
 * @param stateService
 */
export const useSidebarToggle = ({
  stateService,
}: UseSidebarToggleParams): UseSidebarToggleResult => {
  const [initialIsSidebarCollapsed, storeIsSidebarCollapsed] = useLocalStorage<boolean>(
    `${stateService.creationOptions.localStorageKeyPrefix ?? 'unifiedFieldList'}:sidebarClosed`, // as legacy `discover:sidebarClosed` key
    false
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    initialIsSidebarCollapsed ?? false
  );

  const onToggleSidebar = useCallback(
    (isCollapsed) => {
      setIsSidebarCollapsed(isCollapsed);
      if (stateService.creationOptions.localStorageKeyPrefix) {
        storeIsSidebarCollapsed(isCollapsed);
      }
    },
    [
      storeIsSidebarCollapsed,
      setIsSidebarCollapsed,
      stateService.creationOptions.localStorageKeyPrefix,
    ]
  );

  return useMemo(
    () => ({ isSidebarCollapsed, onToggleSidebar }),
    [isSidebarCollapsed, onToggleSidebar]
  );
};
