/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { Prompt, useHistory, useLocation } from 'react-router-dom';

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  hasUnsavedChanges: boolean;
  messageText?: string;
  shouldPromptOnNavigation?: boolean;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({
  hasUnsavedChanges,
  messageText,
  shouldPromptOnNavigation = true,
}) => {
  const location = useLocation();
  const history = useHistory();
  const currentPathRef = useRef(location.pathname);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const modalTitleId = useGeneratedHtmlId();

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

    // Helper to determine if navigation is within the same workflow
    const isSameWorkflowNavigation = (current: string, next: string | undefined): boolean => {
      const normalizePath = (path: string) => path.replace(/^\/app\/workflows/, '');
      const normalizedCurrent = normalizePath(current);
      const normalizedNext = normalizePath(next || '');
      return (
        normalizedNext === normalizedCurrent ||
        (normalizedCurrent.startsWith('/workflow-') &&
          normalizedNext.startsWith(normalizedCurrent)) ||
        (normalizedNext.startsWith('/workflow-') && normalizedCurrent.startsWith(normalizedNext))
      );
    };

    const isSameWorkflow = isSameWorkflowNavigation(currentPath, nextPath);
    const isLeavingPage = !!nextPath && !isSameWorkflow;
    const shouldShow = !!(hasUnsavedChanges && shouldPromptOnNavigation && isLeavingPage);

    if (shouldShow) {
      setPendingNavigation(nextPath);
      setShowModal(true);
    }

    return shouldShow ? false : true; // false blocks navigation, true allows it
  };

  const handleConfirm = () => {
    setShowModal(false);
    if (pendingNavigation) {
      history.push(pendingNavigation);
    }
    setPendingNavigation(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingNavigation(null);
  };

  return (
    <>
      <Prompt when={hasUnsavedChanges && shouldPromptOnNavigation} message={message} />
      {showModal && (
        <EuiConfirmModal
          title={i18n.translate('workflows.shared.unsavedChangesTitle', {
            defaultMessage: 'Leave Without Saving?',
          })}
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          cancelButtonText={i18n.translate('workflows.shared.unsavedChangesCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.shared.unsavedChangesDiscard', {
            defaultMessage: 'Discard Changes',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <p>
            {messageText ||
              i18n.translate('workflows.shared.unsavedChangesMessage', {
                defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
              })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
