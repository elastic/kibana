/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDescriptionList, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';

/** Identifies the document behind a request state, e.g. for display when it can't be resolved. */
export interface RequestStateMeta {
  id: string;
  index: string;
}

/** Renders the request state while a linked document resolves. */
export const UnresolvedDocument = ({
  requestState,
  requestStateMeta,
}: {
  requestState?: ElasticRequestState;
  requestStateMeta?: RequestStateMeta;
}) => {
  if (requestState === ElasticRequestState.NotFound) {
    return (
      <KbnDangerCallout
        announceOnMount
        data-test-subj="docViewerFlyoutNotFound"
        title={
          <FormattedMessage id="unifiedDocViewer.flyout.notFoundTitle" defaultMessage="Not found" />
        }
        text={
          <FormattedMessage
            id="unifiedDocViewer.flyout.notFoundDescription"
            defaultMessage="It may have been deleted, or you may not have access to it."
          />
        }
      >
        {requestStateMeta && (
          <EuiDescriptionList
            compressed
            data-test-subj="docViewerFlyoutNotFoundMeta"
            listItems={[
              {
                title: i18n.translate('unifiedDocViewer.flyout.notFoundMetaIdLabel', {
                  defaultMessage: 'ID',
                }),
                description: requestStateMeta.id,
              },
              {
                title: i18n.translate('unifiedDocViewer.flyout.notFoundMetaIndexLabel', {
                  defaultMessage: 'Index',
                }),
                description: requestStateMeta.index,
              },
            ]}
          />
        )}
      </KbnDangerCallout>
    );
  }

  if (requestState === ElasticRequestState.Error) {
    return (
      <KbnDangerCallout
        announceOnMount
        data-test-subj="docViewerFlyoutError"
        title={
          <FormattedMessage
            id="unifiedDocViewer.flyout.errorTitle"
            defaultMessage="Unable to load"
          />
        }
        text={
          <FormattedMessage
            id="unifiedDocViewer.flyout.errorDescription"
            defaultMessage="Something went wrong while retrieving it."
          />
        }
      />
    );
  }

  return (
    <KbnInfoCallout
      announceOnMount
      data-test-subj="docViewerFlyoutLoading"
      title={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiLoadingSpinner size="m" />
          <FormattedMessage id="unifiedDocViewer.flyout.loadingTitle" defaultMessage="Loading…" />
        </EuiFlexGroup>
      }
    />
  );
};
