/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { LazyChangePointExperienceGrid } from '@kbn/change-point-chart-viewer';
import type {
  ChangePointChartSectionActions,
  UnifiedChangePointGridProps,
} from '@kbn/change-point-chart-viewer';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { useObservable } from '@kbn/use-observable';
import { FetchStatus } from '../../../../application/types';
import { useCurrentTabDataStateContainer } from '../../../../application/main/state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getEsqlDatatableFromDocuments } from '../../../../utils/get_esql_datatable_from_documents';
import { AddPageToDashboardModal } from './add_page_to_dashboard_modal';
import { canAddChangePointChartsToDashboard } from './add_page_to_dashboard_packages';
import type { ChangePointChartSectionProps$ } from './change_point_context';

interface PendingDashboardCharts {
  charts: ReadonlyArray<{
    config: LensXYConfig;
    description?: string;
  }>;
  esqlVariables: UnifiedChangePointGridProps['fetchParams']['esqlVariables'];
  controlsState: UnifiedChangePointGridProps['fetchParams']['controlsState'];
}

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
  const discoverServices = useDiscoverServices();
  const canAddToDashboard = canAddChangePointChartsToDashboard(discoverServices.capabilities);
  const [pendingCharts, setPendingCharts] = useState<PendingDashboardCharts>();
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

  const gridActions = useMemo<ChangePointChartSectionActions>(() => {
    if (!canAddToDashboard) {
      return actions;
    }

    return {
      ...actions,
      addPageToDashboard: (charts) => {
        setPendingCharts({
          charts,
          esqlVariables: chartFetchParams.esqlVariables,
          controlsState: chartFetchParams.controlsState,
        });
      },
    };
  }, [actions, canAddToDashboard, chartFetchParams.controlsState, chartFetchParams.esqlVariables]);

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
    <>
      <LazyChangePointExperienceGrid
        {...gridProps}
        actions={gridActions}
        fetchParams={chartFetchParams}
      />
      {pendingCharts ? (
        <AddPageToDashboardModal
          charts={pendingCharts.charts}
          esqlVariables={pendingCharts.esqlVariables}
          controlsState={pendingCharts.controlsState}
          canCreateNew={Boolean(discoverServices.capabilities.dashboard_v2?.createNew)}
          canEditExisting={Boolean(discoverServices.capabilities.dashboard_v2?.showWriteControls)}
          dataViews={discoverServices.dataViews}
          embeddable={discoverServices.embeddable}
          notifications={discoverServices.notifications}
          onClose={() => setPendingCharts(undefined)}
        />
      ) : null}
    </>
  );
};
