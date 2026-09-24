/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  hasUnsavedChanges: boolean;
  shouldPromptOnNavigation?: boolean;
}

const TITLE = i18n.translate('workflows.unsavedChangesPrompt.title', {
  defaultMessage: 'Discard unsaved changes?',
});

const BODY = i18n.translate('workflows.unsavedChangesPrompt.body', {
  defaultMessage:
    "Your changes to this workflow haven't been saved. If you leave now, they'll be lost.",
});

const CONFIRM_BUTTON = i18n.translate('workflows.unsavedChangesPrompt.discardChanges', {
  defaultMessage: 'Discard changes',
});

const CANCEL_BUTTON = i18n.translate('workflows.unsavedChangesPrompt.keepEditing', {
  defaultMessage: 'Keep editing',
});

/**
 * Blocks SPA and browser navigation when the workflow document is dirty.
 * Uses EuiConfirmModal via overlays.openConfirm (danger Discard, focus Keep editing).
 */
export const UnsavedChangesPrompt = React.memo<Props>(
  ({ hasUnsavedChanges, shouldPromptOnNavigation = true }) => {
    const location = useLocation();
    const history = useHistory();
    const {
      services: {
        http,
        overlays: { openConfirm },
        application: { navigateToUrl },
      },
    } = useKibana();
    const currentPathRef = useRef(location.pathname);

    useEffect(() => {
      currentPathRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
      if (!hasUnsavedChanges) {
        return;
      }
      const handler = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedChanges]);

    useEffect(() => {
      if (!hasUnsavedChanges || !shouldPromptOnNavigation) {
        return;
      }

      const unblock = history.block((nextLocation) => {
        const currentPath = currentPathRef.current;
        const nextPath = nextLocation.pathname?.replace('/app/workflows', '');
        // Allow in-app URL churn within the same workflow (tab/view query updates).
        if (currentPath === nextPath) {
          return undefined;
        }

        async function confirmAsync() {
          const confirmed = await openConfirm(BODY, {
            title: TITLE,
            confirmButtonText: CONFIRM_BUTTON,
            cancelButtonText: CANCEL_BUTTON,
            buttonColor: 'danger',
            defaultFocusedButton: 'cancel',
            // Form-width confirm (not the default breakpoint-m confirmation width).
            maxWidth: 400,
            'data-test-subj': 'workflowUnsavedChangesConfirmModal',
          });

          if (confirmed) {
            const url = http.basePath.prepend(nextLocation.pathname) + nextLocation.search + nextLocation.hash;
            unblock();
            navigateToUrl(url, { state: nextLocation.state });
          }
        }

        confirmAsync();
        return false;
      });

      return unblock;
    }, [
      hasUnsavedChanges,
      shouldPromptOnNavigation,
      history,
      http.basePath,
      navigateToUrl,
      openConfirm,
    ]);

    return null;
  }
);
UnsavedChangesPrompt.displayName = 'UnsavedChangesPrompt';
