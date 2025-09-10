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

import { i18n } from '@kbn/i18n';

const DEFAULT_MESSAGE_TEXT = i18n.translate('workflows.shared.unsavedChangesMessage', {
  defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
});
interface Props {
  hasUnsavedChanges: boolean;
  messageText?: string;
  shouldPromptOnNavigation?: boolean;
  isTabSwitch?: boolean;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({
  hasUnsavedChanges,
  messageText = DEFAULT_MESSAGE_TEXT,
  shouldPromptOnNavigation = true,
}) => {
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && shouldPromptOnNavigation) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges, shouldPromptOnNavigation]);

  // Keep ref up to date with current path
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  const message = (nextLocation: any) => {
    const nextPath: string | undefined = nextLocation?.pathname;
    const currentPath = currentPathRef.current;

    // Normalize paths by removing /app/workflows prefix for comparison
    const normalizePath = (path: string) => {
      return path.replace(/^\/app\/workflows/, '');
    };

    const normalizedCurrent = normalizePath(currentPath);
    const normalizedNext = nextPath ? normalizePath(nextPath) : '';

    // Consider navigation within the same workflow page as in-page
    // Only if both paths contain the same workflow ID
    const isSameWorkflow =
      !!nextPath &&
      (normalizedNext === normalizedCurrent ||
        (normalizedCurrent.startsWith('/workflow-') &&
          normalizedNext.startsWith(normalizedCurrent)) ||
        (normalizedNext.startsWith('/workflow-') && normalizedCurrent.startsWith(normalizedNext)));

    const isLeavingPage = !!nextPath && !isSameWorkflow;
    const shouldShow = !!(hasUnsavedChanges && shouldPromptOnNavigation && isLeavingPage);

    return shouldShow ? messageText : true;
  };

  // Use `when` to enable blocking only if there are unsaved changes
  return <Prompt when={hasUnsavedChanges && shouldPromptOnNavigation} message={message} />;
};
