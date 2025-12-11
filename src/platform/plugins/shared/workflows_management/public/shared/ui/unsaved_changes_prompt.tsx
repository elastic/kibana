/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef } from 'react';
import { Prompt, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

interface Props {
  hasUnsavedChanges: boolean;
  shouldPromptOnNavigation?: boolean;
}

export const UnsavedChangesPrompt = React.memo<Props>(
  ({ hasUnsavedChanges, shouldPromptOnNavigation = true }) => {
    const location = useLocation();
    const currentPathRef = useRef(location.pathname);

    // Keep ref up to date with current path
    useEffect(() => {
      currentPathRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
      const handler = (event: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          // These 2 lines of code are the recommendation from MDN for triggering a browser prompt for confirming
          // whether or not a user wants to leave the current site.
          event.preventDefault();
          event.returnValue = '';
        }
      };
      // Adding this handler will prompt users if they are navigating to a new page, outside of the Kibana SPA
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedChanges]);

    const message = (nextLocation: any) => {
      // Current path uses workflow base path, so only contains only the last part of the path (the "/workflow-123"" or "/create")
      const currentPath = currentPathRef.current;
      // nextLocation uses full path, so contains the entire path (the "/app/workflows/workflow-123" or "/app/workflows/create")
      const nextPath: string | undefined = nextLocation?.pathname;

      const cleanNextPath = nextPath?.replace('/app/workflows', '');
      // Check if navigating within the same workflow
      if (currentPath === cleanNextPath) {
        return true; // Allow navigation within same workflow
      }

      // Show browser's native confirmation dialog
      return i18n.translate('workflows.unsavedChangesPrompt.message', {
        defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
      });
    };

    return <Prompt when={hasUnsavedChanges && shouldPromptOnNavigation} message={message} />;
  }
);
UnsavedChangesPrompt.displayName = 'UnsavedChangesPrompt';
