/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandedDocNotice } from '../../hooks/use_expanded_doc_sync';

/**
 * Explains a flyout showing a document that is not part of the current results, which is
 * reached by following a link to a document the current search does not return.
 *
 * Callers pass nothing at all when there is no notice, rather than rendering this with
 * {@link ExpandedDocNotice.None}, so the flyout can tell an empty subheader from a populated one.
 */
export const ExpandedDocNoticeText = ({
  notice,
}: {
  notice: Exclude<ExpandedDocNotice, ExpandedDocNotice.None>;
}) => {
  const isSearching = notice === ExpandedDocNotice.SearchingResults;

  return (
    <EuiText size="xs" color="subdued" data-test-subj={`expandedDocNotice-${notice}`}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {isSearching ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiIcon type="info" size="s" aria-hidden={true} />
        )}
        {isSearching ? (
          <FormattedMessage
            id="discover.docViews.flyout.searchingResults"
            defaultMessage="Looking for this document in the current results"
          />
        ) : (
          <FormattedMessage
            id="discover.docViews.flyout.notInResults"
            defaultMessage="This document is not in the current results"
          />
        )}
      </EuiFlexGroup>
    </EuiText>
  );
};
