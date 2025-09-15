/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { Prompt, useLocation } from 'react-router-dom';

interface Props {
  hasUnsavedChanges: boolean;
  shouldPromptOnNavigation?: boolean;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({
  hasUnsavedChanges,
  shouldPromptOnNavigation = true,
}) => {
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);

  // Keep ref up to date with current path
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  const message = (nextLocation: any) => {
    const nextPath: string | undefined = nextLocation?.pathname;
    const currentPath = currentPathRef.current;

    // Check if navigation is within the same workflow (tab navigation)
    // Look for workflow ID in the path (could be /app/workflows/workflow-123 or /workflow-123)
    const getWorkflowId = (path: string) => {
      const parts = path.split('/');
      const workflowIndex = parts.findIndex((part) => part.startsWith('workflow-'));
      return workflowIndex !== -1 ? parts[workflowIndex] : null;
    };

    const currentWorkflowId = getWorkflowId(currentPath);
    const nextWorkflowId = getWorkflowId(nextPath || '');

    const isSameWorkflow =
      currentWorkflowId && nextWorkflowId && currentWorkflowId === nextWorkflowId;

    // Only show prompt if leaving the workflow
    if (isSameWorkflow) {
      return true; // Allow navigation within same workflow
    }

    // Show browser's native confirmation dialog
    return 'Your changes have not been saved. Are you sure you want to leave?';
  };

  return <Prompt when={hasUnsavedChanges && shouldPromptOnNavigation} message={message} />;
};
