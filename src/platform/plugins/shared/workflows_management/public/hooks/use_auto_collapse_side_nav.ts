/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { useKibana } from './use_kibana';

/**
 * Collapses the side nav while the calling component is mounted and expands it again on unmount,
 * unless the user had already collapsed it.
 */
export const useAutoCollapseSideNav = (): void => {
  const { chrome } = useKibana().services;

  useEffect(() => {
    const { sideNav } = chrome;
    // The collapsed state is persisted, so only undo what this hook changed.
    if (sideNav.getIsCollapsed()) {
      return;
    }
    sideNav.setIsCollapsed(true);
    // Unmount does not run on reload or tab close. Chrome persists synchronously, so restoring
    // on `pagehide` keeps the user's preference saved.
    const restore = () => sideNav.setIsCollapsed(false);
    window.addEventListener('pagehide', restore);
    return () => {
      window.removeEventListener('pagehide', restore);
      restore();
    };
  }, [chrome]);
};
