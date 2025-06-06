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
import type { TimeRange, Filter, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiCodeBlock } from '@elastic/eui';
import { getDisplayValueFromFilter } from '@kbn/data-plugin/public';
import { FilterBadge } from '../filter_badge/filter_badge';
import { ReadOnlyTimeRange } from './read_only_time_range';

interface SearchDetailsProps {
  index: string;
  timeRange: TimeRange;
  dataView: DataView; // TODO: Handle multiple data views
  query?: Query;
  filters?: Filter[];
}

export const SearchDetails: React.FC<SearchDetailsProps> = ({
  index,
  timeRange,
  query,
  filters,
  dataView,
}) => {
  const hasESQLQuery = query?.esql;
  const hasNonESQLQuery = query?.query;
  const hasQuery = hasESQLQuery || hasNonESQLQuery;
  const hasFilters = filters && filters.length > 0;
  const hasDataView = dataView !== null && dataView !== undefined;
  const canViewFilters = hasDataView && hasFilters;

  return (
    <EuiFlexGroup gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{INDEX_PATTERN_LABEL}</EuiText>
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
          <ReadOnlyTimeRange timeRange={timeRange} />
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
      {canViewFilters &&
        filters.map((filter, i) => (
          <EuiFlexItem grow={false} key={i}>
            <FilterBadge
              filter={filter}
              dataViews={[dataView]} // Assuming index is the data view title
              hideAlias={true}
              valueLabel={getDisplayValueFromFilter(filter, [dataView])}
              filterLabelStatus={''}
              readOnly={true}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
};

const QUERY_LABEL = i18n.translate('discover.cases.attachment.queryLabel', {
  defaultMessage: 'Query',
});

const INDEX_PATTERN_LABEL = i18n.translate('discover.cases.attachment.indexPatternLabel', {
  defaultMessage: 'Index pattern',
});
