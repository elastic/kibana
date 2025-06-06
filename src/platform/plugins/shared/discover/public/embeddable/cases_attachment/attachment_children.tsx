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
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import type { SavedSearchCasesAttachmentPersistedState } from '@kbn/discover-utils';
import { useDiscoverServices } from '../../hooks/use_discover_services';

interface SavedSearchPersistableStateAttachmentViewProps {
  persistableStateAttachmentState: SavedSearchCasesAttachmentPersistedState;
}

export const CommentChildren: React.FC<SavedSearchPersistableStateAttachmentViewProps> = ({
  persistableStateAttachmentState,
}) => {
  const {
    embeddable,
    data: {
      search: { searchSource },
      dataViews,
    },
  } = useDiscoverServices();
  const { index, timeRange, query, filters, timestampField } = persistableStateAttachmentState;
  const hasESQLQuery = query?.esql;
  const hasNonESQLQuery = query?.query;
  const hasQuery = hasESQLQuery || hasNonESQLQuery;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{'Index pattern:'}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="success">
                  {index}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{'Time range:'}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="success">
                  {timeRange ? `${timeRange.from} to ${timeRange.to}` : 'No time range set'}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        </EuiFlexItem>
        {hasQuery && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{QUERY_LABEL}</EuiText>
                </EuiFlexItem>
                {hasESQLQuery && (
                  <EuiFlexItem grow={false}>
                    <EuiCodeBlock language="esql" paddingSize="none">
                      {query?.esql}
                    </EuiCodeBlock>
                  </EuiFlexItem>
                )}
                {hasNonESQLQuery && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="success">
                      {query?.query}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <LazySavedSearchComponent
        dependencies={{ embeddable, dataViews, searchSource }}
        index={index}
        timeRange={timeRange}
        query={query}
        filters={filters}
        timestampField={timestampField}
        height={'360px'}
      />
    </>
  );
};

const QUERY_LABEL = i18n.translate('discover.cases.attachment.queryLabel', {
  defaultMessage: 'Query',
});
// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default CommentChildren;
