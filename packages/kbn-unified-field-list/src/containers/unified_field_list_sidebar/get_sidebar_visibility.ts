/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

export interface SidebarVisibilityIsCollapsedObservable {
  value: boolean;
  lastChangedBy: string | undefined; // `undefined` is for the default behaviour
}

export interface SidebarVisibility {
  isCollapsed$: BehaviorSubject<SidebarVisibilityIsCollapsedObservable>;
  toggle: (
    isCollapsed: boolean,
    options?: { lastChangedBy?: string; skipPersisting?: boolean }
  ) => void;
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
  const isCollapsed$ = new BehaviorSubject<SidebarVisibilityIsCollapsedObservable>({
    value: localStorageKey ? getIsCollapsed(localStorageKey) : false,
    lastChangedBy: undefined,
  });

  return {
    isCollapsed$,
    toggle: (isCollapsed, options) => {
      isCollapsed$.next({
        value: isCollapsed,
        lastChangedBy: options?.lastChangedBy,
      });
      if (localStorageKey && !options?.skipPersisting) {
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
