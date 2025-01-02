/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SearchResponseWarningsEmptyPrompt } from '@kbn/search-response-warnings';
import { NoResultsSuggestions } from './no_results_suggestions';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import './_no_results.scss';

export interface DiscoverNoResultsProps {
  stateContainer: DiscoverStateContainer;
  isTimeBased?: boolean;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  dataView: DataView;
  onDisableFilters: () => void;
}

export function DiscoverNoResults({
  stateContainer,
  isTimeBased,
  query,
  filters,
  dataView,
  onDisableFilters,
}: DiscoverNoResultsProps) {
  const { documents$ } = stateContainer.dataState.data$;
  const interceptedWarnings = useDataState(documents$).interceptedWarnings;

  if (interceptedWarnings?.length) {
    return <SearchResponseWarningsEmptyPrompt warnings={interceptedWarnings} />;
  }

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <NoResultsSuggestions
          isTimeBased={isTimeBased}
          query={query}
          filters={filters}
          dataView={dataView}
          onDisableFilters={onDisableFilters}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
