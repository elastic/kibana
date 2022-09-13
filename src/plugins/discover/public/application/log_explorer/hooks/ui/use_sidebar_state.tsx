/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useCallback } from 'react';
import { DiscoverServices } from '../../../../build_services';

/**
 * Local storage key for sidebar persistence state
 */
export const SIDEBAR_CLOSED_KEY = 'discover:sidebarClosed';

export const useSidebarState = ({ storage }: { storage: DiscoverServices['storage'] }) => {
  const [isSidebarClosed, setIsSidebarClosed] = useState(Boolean(storage.get(SIDEBAR_CLOSED_KEY)));

  const toggleSidebarCollapse = useCallback(() => {
    storage.set(SIDEBAR_CLOSED_KEY, !isSidebarClosed);
    setIsSidebarClosed(!isSidebarClosed);
  }, [isSidebarClosed, storage]);

  return { isSidebarClosed, setIsSidebarClosed, toggleSidebarCollapse };
};
