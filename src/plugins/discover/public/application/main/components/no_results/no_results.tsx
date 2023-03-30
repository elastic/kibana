/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { NoResultsSuggestions } from './no_results_suggestions';
import './_no_results.scss';

export interface DiscoverNoResultsProps {
  isTimeBased?: boolean;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  dataView: DataView;
  onDisableFilters: () => void;
}

export function DiscoverNoResults({
  isTimeBased,
  query,
  filters,
  dataView,
  onDisableFilters,
}: DiscoverNoResultsProps) {
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
