/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { useAppContext } from '../../app_context';
import { AiAssistantSelectionPage } from './ai_assistant_selection_page';

/**
 * Route component that redirects based on space solution or shows selection page
 */
export function SpaceAwareRoute() {
  const { navigateToApp, spaces } = useAppContext();

  useEffect(() => {
    if (!spaces) return;

    const subscription = spaces.getActiveSpace$().subscribe((space) => {
      const solution = space?.solution;
      
      if (solution === 'oblt' || solution === 'es') {
        navigateToApp('management', { path: 'ai/observabilityAiAssistantManagement' });
      } else if (solution === 'security') {
        navigateToApp('management', { path: 'ai/securityAiAssistantManagement' });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigateToApp, spaces]);

  // For classic spaces or when spaces is undefined, show the selection page
  return <AiAssistantSelectionPage />;
}
