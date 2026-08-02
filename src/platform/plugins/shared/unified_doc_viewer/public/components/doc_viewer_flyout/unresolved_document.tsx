/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';

/**
 * Rendered in the flyout body while the expanded document is still being resolved, or when it
 * could not be resolved at all. Reached when opening a shared link to a document that is not
 * part of the current results, since it has to be fetched by ID before it can be shown.
 */
export const UnresolvedDocument = ({ requestState }: { requestState?: ElasticRequestState }) => {
  if (requestState === ElasticRequestState.NotFound) {
    return (
      <KbnDangerCallout
        announceOnMount
        data-test-subj="docViewerFlyoutNotFound"
        title={
          <FormattedMessage
            id="unifiedDocViewer.flyout.notFoundTitle"
            defaultMessage="Cannot find document"
          />
        }
        text={
          <FormattedMessage
            id="unifiedDocViewer.flyout.notFoundDescription"
            defaultMessage="It may have been deleted, or you may not have access to it."
          />
        }
      />
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
            defaultMessage="Cannot load document"
          />
        }
        text={
          <FormattedMessage
            id="unifiedDocViewer.flyout.errorDescription"
            defaultMessage="Something went wrong while retrieving the document."
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
          <FormattedMessage id="unifiedDocViewer.flyout.loading" defaultMessage="Loading…" />
        </EuiFlexGroup>
      }
    />
  );
};
