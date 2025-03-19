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
import {
  FieldStats,
  type FieldStatsProps,
  type FieldStatsServices,
} from '../../components/field_stats';
import { useQuerySubscriber, hasQuerySubscriberData } from '../../hooks/use_query_subscriber';
import type { UnifiedFieldListSidebarContainerStateService } from '../../types';

export interface UnifiedFieldListItemStatsProps {
  stateService: UnifiedFieldListSidebarContainerStateService;
  field: DataViewField;
  services: Omit<FieldStatsServices, 'uiSettings'> & {
    core: CoreStart;
  };
  dataView: DataView;
  multiFields?: Array<{ field: DataViewField; isSelected: boolean }>;
  onAddFilter: FieldStatsProps['onAddFilter'];
  additionalFilters?: FieldStatsProps['filters'];
}

export const UnifiedFieldListItemStats: React.FC<UnifiedFieldListItemStatsProps> = React.memo(
  ({ stateService, services, field, dataView, multiFields, onAddFilter, additionalFilters }) => {
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
      timeRangeUpdatesType: stateService.creationOptions.timeRangeUpdatesType,
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

    const filters = useMemo(
      () => [...(querySubscriberResult.filters ?? []), ...(additionalFilters ?? [])],
      [querySubscriberResult.filters, additionalFilters]
    );

    if (!hasQuerySubscriberData(querySubscriberResult)) {
      return null;
    }

    return (
      <FieldStats
        services={statsServices}
        query={querySubscriberResult.query}
        filters={filters}
        fromDate={querySubscriberResult.fromDate}
        toDate={querySubscriberResult.toDate}
        dataViewOrDataViewId={dataView}
        field={fieldForStats}
        data-test-subj={stateService.creationOptions.dataTestSubj?.fieldListItemStatsDataTestSubj}
        onAddFilter={onAddFilter}
      />
    );
  }
);
