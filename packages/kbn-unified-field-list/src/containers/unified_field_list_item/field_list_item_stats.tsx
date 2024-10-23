/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import {
  FieldStats,
  type FieldStatsProps,
  type FieldStatsServices,
} from '../../components/field_stats';
import { useQuerySubscriber, hasQuerySubscriberData } from '../../hooks/use_query_subscriber';
import { UnifiedFieldListSidebarContainerCreationOptions } from '../../types';

export interface UnifiedFieldListItemStatsProps {
  options: UnifiedFieldListSidebarContainerCreationOptions;
  field: DataViewField;
  services: Omit<FieldStatsServices, 'uiSettings'> & {
    core: CoreStart;
  };
  dataView: DataView;
  multiFields?: Array<{ field: DataViewField; isSelected: boolean }>;
  onAddFilter: FieldStatsProps['onAddFilter'];
  additionalFilters?: FieldStatsProps['filters'];
  /**
   * Custom query and filters to override the default subscription to the query service
   */
  queryAndFiltersOverride?: {
    query: Query | AggregateQuery;
    filters: Filter[];
    fromDate: string;
    toDate: string;
  };
}

export const UnifiedFieldListItemStats: React.FC<UnifiedFieldListItemStatsProps> = React.memo(
  ({
    options,
    services,
    field,
    dataView,
    multiFields,
    onAddFilter,
    additionalFilters,
    queryAndFiltersOverride,
  }) => {
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
      timeRangeUpdatesType: options.timeRangeUpdatesType,
      isDisabled: Boolean(queryAndFiltersOverride),
    });
    // prioritize an aggregatable multi field if available or take the parent field
    const fieldForStats = useMemo(
      () =>
        (multiFields?.length &&
          multiFields.find((multiField) => multiField.field.aggregatable)?.field) ||
        field,
      [field, multiFields]
    );

    const statsServices: FieldStatsServices = useMemo(
      () => ({
        data: services.data,
        dataViews: services.dataViews,
        fieldFormats: services.fieldFormats,
        charts: services.charts,
        uiSettings: services.core.uiSettings,
      }),
      [services]
    );

    const query = queryAndFiltersOverride
      ? queryAndFiltersOverride.query
      : querySubscriberResult.query;
    const filters = useMemo(
      () => [
        ...((queryAndFiltersOverride
          ? queryAndFiltersOverride.filters
          : querySubscriberResult.filters) ?? []),
        ...(additionalFilters ?? []),
      ],
      [querySubscriberResult.filters, additionalFilters, queryAndFiltersOverride]
    );
    const fromDate = queryAndFiltersOverride
      ? queryAndFiltersOverride.fromDate
      : querySubscriberResult.fromDate;
    const toDate = queryAndFiltersOverride
      ? queryAndFiltersOverride.toDate
      : querySubscriberResult.toDate;

    if (!queryAndFiltersOverride && !hasQuerySubscriberData(querySubscriberResult)) {
      return null;
    }

    if (!query || !filters || !fromDate || !toDate) {
      return null;
    }

    return (
      <FieldStats
        services={statsServices}
        query={query}
        filters={filters}
        fromDate={fromDate}
        toDate={toDate}
        dataViewOrDataViewId={dataView}
        field={fieldForStats}
        data-test-subj={options.dataTestSubj?.fieldListItemStatsDataTestSubj}
        onAddFilter={onAddFilter}
      />
    );
  }
);
