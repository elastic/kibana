/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { isOfQueryType } from '@kbn/es-query';
import { NoResultsSuggestionDefault } from './no_results_suggestion_default';
import {
  NoResultsSuggestionWhenFilters,
  NoResultsSuggestionWhenFiltersProps,
} from './no_results_suggestion_when_filters';
import { NoResultsSuggestionWhenQuery } from './no_results_suggestion_when_query';
import { NoResultsSuggestionWhenTimeRange } from './no_results_suggestion_when_time_range';
import { hasActiveFilter } from '../../layout/utils';

interface NoResultsSuggestionProps {
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  isTimeBased?: boolean;
  onDisableFilters: NoResultsSuggestionWhenFiltersProps['onDisableFilters'];
}

export function NoResultsSuggestions({
  dataView,
  query,
  filters,
  isTimeBased,
  onDisableFilters,
}: NoResultsSuggestionProps) {
  const hasQuery = isOfQueryType(query) && !!query?.query;
  const hasFilters = hasActiveFilter(filters);
  const canAdjustSearchCriteria = isTimeBased || hasFilters || hasQuery;

  if (canAdjustSearchCriteria) {
    return (
      <>
        {isTimeBased && (
          <>
            <NoResultsSuggestionWhenTimeRange dataView={dataView} query={query} filters={filters} />
          </>
        )}
        {hasQuery && (
          <>
            <EuiSpacer size="s" />
            <NoResultsSuggestionWhenQuery />
          </>
        )}
        {hasFilters && (
          <>
            <EuiSpacer size="s" />
            <NoResultsSuggestionWhenFilters onDisableFilters={onDisableFilters} />
          </>
        )}
      </>
    );
  }

  return <NoResultsSuggestionDefault />;
}
