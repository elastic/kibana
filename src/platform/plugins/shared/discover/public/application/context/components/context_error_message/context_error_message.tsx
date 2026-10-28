/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { LoadingStatusEntry } from '../../services/context_query_state';
import { FailureReason, LoadingStatus } from '../../services/context_query_state';
import { SurrDocType } from '../../services/context';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

type ContextErrorMessageType = 'anchor' | SurrDocType;

export interface ContextErrorMessageProps {
  /**
   * the type of the failed request
   */
  type: ContextErrorMessageType;
  /**
   * the status of the loading action
   */
  status: LoadingStatusEntry;
}

const getErrorTitle = (type: ContextErrorMessageType) => {
  switch (type) {
    case SurrDocType.PREDECESSORS:
      return i18n.translate('discover.context.failedToLoadNewerDocumentsDescription', {
        defaultMessage: 'Failed to load newer documents',
      });
    case SurrDocType.SUCCESSORS:
      return i18n.translate('discover.context.failedToLoadOlderDocumentsDescription', {
        defaultMessage: 'Failed to load older documents',
      });
    default:
      return i18n.translate('discover.context.failedToLoadAnchorDocumentDescription', {
        defaultMessage: 'Failed to load the anchor document',
      });
  }
};

export function ContextErrorMessage({ type, status }: ContextErrorMessageProps) {
  const { core } = useDiscoverServices();

  if (status.value !== LoadingStatus.FAILED) {
    return null;
  }

  const { error, reason } = status;
  const title = getErrorTitle(type);

  return (
    <KbnDangerCallout
      announceOnMount
      size="s"
      title={title}
      text={
        reason === FailureReason.INVALID_TIEBREAKER ? (
          <FormattedMessage
            id="discover.context.invalidTieBreakerFiledSetting"
            defaultMessage="Invalid tie breaker field setting"
          />
        ) : (
          <>
            {error && <p>{error.message}</p>}
            {type === 'anchor' && reason === FailureReason.UNKNOWN && (
              <p>
                <FormattedMessage
                  id="discover.context.reloadPageDescription.reloadOrVisitTextMessage"
                  defaultMessage="Please reload or go back to the document list to select a valid anchor document."
                />
              </p>
            )}
          </>
        )
      }
      actionProps={
        error
          ? {
              primary: {
                onClick: () => core.notifications.showErrorDialog({ title, error }),
                children: i18n.translate('discover.context.viewErrorDetailsButtonLabel', {
                  defaultMessage: 'View details',
                }),
                'data-test-subj': `${type}ErrorMsgViewDetailsButton`,
              },
            }
          : undefined
      }
      data-test-subj={`${type}ErrorMsg`}
    />
  );
}
