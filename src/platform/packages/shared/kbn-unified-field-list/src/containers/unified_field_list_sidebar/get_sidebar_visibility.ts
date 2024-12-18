/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

export interface SidebarVisibility {
  isCollapsed$: BehaviorSubject<boolean>;
  toggle: (isCollapsed: boolean) => void;
}

export interface GetSidebarStateParams {
  localStorageKey?: string;
}

/**
 * For managing sidebar visibility state
 * @param localStorageKey
 */
export const getSidebarVisibility = ({
  localStorageKey,
}: GetSidebarStateParams): SidebarVisibility => {
  const isCollapsed$ = new BehaviorSubject<boolean>(
    localStorageKey ? getIsCollapsed(localStorageKey) : false
  );

  return {
    isCollapsed$,
    toggle: (isCollapsed) => {
      isCollapsed$.next(isCollapsed);
      if (localStorageKey) {
        setIsCollapsed(localStorageKey, isCollapsed);
      }
    },
  };
};

function getIsCollapsed(localStorageKey: string) {
  let isCollapsed = false;
  try {
    isCollapsed = localStorage?.getItem(localStorageKey) === 'true';
  } catch {
    // nothing
  }

  return isCollapsed;
}

function setIsCollapsed(localStorageKey: string, isCollapsed: boolean) {
  try {
    localStorage?.setItem(localStorageKey, String(isCollapsed));
  } catch {
    // nothing
  }
}
