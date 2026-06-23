/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { useNavigateToApp } from '../shared/chrome_hooks';

const DISCOVER_APP_ID = 'discover';

/**
 * Bootstraps the application workspace with Discover when agent-first layout is active.
 */
export function ApplicationWorkspaceBootstrap() {
  const navigateToApp = useNavigateToApp();
  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    queueMicrotask(() => navigateToApp(DISCOVER_APP_ID));
  }, [navigateToApp]);

  return null;
}
