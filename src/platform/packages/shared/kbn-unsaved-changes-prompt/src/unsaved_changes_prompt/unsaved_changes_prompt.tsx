/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { ApplicationStart, ScopedHistory, OverlayStart, HttpStart } from '@kbn/core/public';

const DEFAULT_BODY_TEXT = i18n.translate('unsavedChangesPrompt.defaultModalText', {
  defaultMessage: `The data will be lost if you leave this page without saving the changes.`,
});

const DEFAULT_TITLE_TEXT = i18n.translate('unsavedChangesPrompt.defaultModalTitle', {
  defaultMessage: 'Discard unsaved changes?',
});

const DEFAULT_CANCEL_BUTTON = i18n.translate('unsavedChangesPrompt.defaultModalCancel', {
  defaultMessage: 'Keep editing',
});

const DEFAULT_CONFIRM_BUTTON = i18n.translate('unsavedChangesPrompt.defaultModalConfirm', {
  defaultMessage: 'Leave page',
});

interface BaseProps {
  hasUnsavedChanges: boolean;
}

interface SpaBlockingProps extends BaseProps {
  http: HttpStart;
  openConfirm: OverlayStart['openConfirm'];
  history: ScopedHistory;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  titleText?: string;
  messageText?: string;
  cancelButtonText?: string;
  confirmButtonText?: string;
  blockSpaNavigation?: true;
}

interface BrowserBlockingProps extends BaseProps {
  blockSpaNavigation: false;
}

type Props = SpaBlockingProps | BrowserBlockingProps;

const isSpaBlocking = (props: Props): props is SpaBlockingProps =>
  props.blockSpaNavigation !== false;

export const useUnsavedChangesPrompt = (props: Props) => {
  const { hasUnsavedChanges, blockSpaNavigation = true } = props;

  useEffect(() => {
    if (hasUnsavedChanges) {
      const handler = (event: BeforeUnloadEvent) => {
        // These 2 lines of code are the recommendation from MDN for triggering a browser prompt for confirming
        // whether or not a user wants to leave the current site.
        event.preventDefault();
        event.returnValue = '';
      };
      // Adding this handler will prompt users if they are navigating to a new page, outside of the Kibana SPA
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || !isSpaBlocking(props)) {
      return;
    }

    const {
      openConfirm,
      http,
      history,
      navigateToUrl,
      // Provide overrides for confirm dialog
      messageText = DEFAULT_BODY_TEXT,
      titleText = DEFAULT_TITLE_TEXT,
      confirmButtonText = DEFAULT_CONFIRM_BUTTON,
      cancelButtonText = DEFAULT_CANCEL_BUTTON,
    } = props;

    const unblock = history.block((state) => {
      async function confirmAsync() {
        const confirmResponse = await openConfirm(messageText, {
          title: titleText,
          cancelButtonText,
          confirmButtonText,
          'data-test-subj': 'navigationBlockConfirmModal',
        });

        if (confirmResponse) {
          // Compute the URL we want to redirect to
          const url = http.basePath.prepend(state.pathname) + state.hash + state.search;
          // Unload history block
          unblock();
          // Navigate away
          navigateToUrl(url, {
            state: state.state,
          });
        }
      }

      confirmAsync();
      return false;
    });

    return unblock;
  }, [hasUnsavedChanges, blockSpaNavigation, props]);
};
