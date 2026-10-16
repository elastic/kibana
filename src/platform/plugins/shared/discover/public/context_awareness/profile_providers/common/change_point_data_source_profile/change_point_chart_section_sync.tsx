/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { LazyChangePointExperienceGrid } from '@kbn/change-point-chart-viewer';
import type {
  ChangePointChartSectionActions,
  UnifiedChangePointGridProps,
} from '@kbn/change-point-chart-viewer';
import { useObservable } from '@kbn/use-observable';
import { FetchStatus } from '../../../../application/types';
import { useCurrentTabDataStateContainer } from '../../../../application/main/state_management/redux';
import { getEsqlDatatableFromDocuments } from '../../../../utils/get_esql_datatable_from_documents';
import type { ChangePointChartSectionProps$ } from './change_point_context';

interface ChangePointChartSectionSyncProps {
  gridProps: UnifiedChangePointGridProps;
  actions: ChangePointChartSectionActions;
  chartSectionProps$: ChangePointChartSectionProps$;
}

/**
 * Renders the change-point chart and shares its props with the row flyout.
 * The histogram fetch leaves out the documents table, so the rows are added here.
 */
export const ChangePointChartSectionSync: React.FC<ChangePointChartSectionSyncProps> = ({
  gridProps,
  actions,
  chartSectionProps$,
}) => {
  const { fetchParams, fetch$, services, onBrushEnd, onFilter } = gridProps;
  const documents = useObservable(useCurrentTabDataStateContainer().data$.documents$);

  // Match the source id so a new query doesn't chart the previous rows.
  // PARTIAL can show up after COMPLETE, and both already have the rows.
  const documentsTable = useMemo(() => {
    if (documents.dataSource?.id !== fetchParams.dataSource.id) {
      return undefined;
    }
    const documentsValue =
      documents.fetchStatus === FetchStatus.PARTIAL
        ? { ...documents, fetchStatus: FetchStatus.COMPLETE }
        : documents;
    return getEsqlDatatableFromDocuments({ documentsValue }).table;
  }, [documents, fetchParams.dataSource]);

  const chartFetchParams = useMemo(
    () =>
      fetchParams.table || !documentsTable
        ? fetchParams
        : { ...fetchParams, table: documentsTable },
    [documentsTable, fetchParams]
  );

  useEffect(() => {
    chartSectionProps$.next({
      fetchParams: chartFetchParams,
      fetch$,
      services,
      onBrushEnd,
      onFilter,
    });
  }, [chartFetchParams, chartSectionProps$, fetch$, onBrushEnd, onFilter, services]);

  return (
    <LazyChangePointExperienceGrid
      {...gridProps}
      actions={actions}
      fetchParams={chartFetchParams}
    />
  );
};
