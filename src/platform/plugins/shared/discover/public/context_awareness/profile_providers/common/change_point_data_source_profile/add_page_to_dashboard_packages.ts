/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import { toAsCodeQuery } from '@kbn/as-code-shared-transforms';
import type { Capabilities } from '@kbn/core/public';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE } from '../../../../../common';

/** Full dashboard width. The grid is 48 columns. */
const CHANGE_POINT_GRID_PANEL_WIDTH = 48;

/**
 * Dashboard rows for two chart rows. A row is 20px plus an 8px gutter, and the panel
 * includes a 32px title bar.
 */
const CHANGE_POINT_GRID_PANEL_HEIGHT = 19;

/** Dashboard rows for one chart row, using the same title bar and padding. */
const CHANGE_POINT_SERIES_PANEL_HEIGHT = 11;

export interface ChangePointDashboardPage {
  esql: string;
  singleSeries?: boolean;
}

export const toChangePointDashboardPackages = ({
  page,
  applyDashboardContext,
  timeRange,
  filters,
  inputQuery,
  esqlVariables,
  controlsState,
}: {
  page: ChangePointDashboardPage;
  applyDashboardContext: boolean;
  timeRange: TimeRange;
  filters?: Filter[];
  inputQuery?: Query;
  esqlVariables?: ESQLControlVariable[];
  controlsState?: ControlPanelsState;
}): EmbeddablePackageState[] => {
  const panel: EmbeddablePackageState = {
    type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
    serializedState: {
      esql: page.esql,
      apply_dashboard_context: applyDashboardContext,
      ...(applyDashboardContext
        ? {}
        : {
            time_range: { from: timeRange.from, to: timeRange.to },
            static_context: {
              filters: fromStoredFilters(filters),
              query: toAsCodeQuery(inputQuery),
              esql_variables: esqlVariables?.map(({ key, value, type }) => ({ key, value, type })),
            },
          }),
    },
    size: {
      width: CHANGE_POINT_GRID_PANEL_WIDTH,
      height: page.singleSeries ? CHANGE_POINT_SERIES_PANEL_HEIGHT : CHANGE_POINT_GRID_PANEL_HEIGHT,
    },
  };

  if (!applyDashboardContext) {
    return [panel];
  }

  const controlPackages = Object.values(controlsState ?? {}).map((control) => ({
    type: control.type,
    serializedState: omit(control, ['type', 'order', 'width', 'grow']),
  }));

  return [panel, ...controlPackages];
};

export const canAddChangePointChartsToDashboard = (capabilities: Capabilities): boolean => {
  const dashboardCapabilities = capabilities.dashboard_v2 as
    | { showWriteControls?: boolean; createNew?: boolean }
    | undefined;
  return Boolean(dashboardCapabilities?.showWriteControls || dashboardCapabilities?.createNew);
};
