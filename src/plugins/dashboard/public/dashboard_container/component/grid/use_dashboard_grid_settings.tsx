/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';

import { useEuiTheme } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../dashboard_constants';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

export const useDashboardGridSettings = (panelsInOrder: string[]) => {
  const dashboard = useDashboardContainer();
  const { euiTheme } = useEuiTheme();

  const panels = dashboard.select((state) => state.explicitInput.panels);
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);

  const layouts = useMemo(() => {
    return {
      lg: panelsInOrder.map((embeddableId) => panels[embeddableId].gridData),
    };
  }, [panels, panelsInOrder]);

  const breakpoints = useMemo(
    () => ({ lg: euiTheme.breakpoint.m, ...(viewMode === ViewMode.VIEW ? { sm: 0 } : {}) }),
    [viewMode, euiTheme.breakpoint.m]
  );

  const columns = useMemo(
    () => ({
      lg: DASHBOARD_GRID_COLUMN_COUNT,
      ...(viewMode === ViewMode.VIEW ? { sm: 1 } : {}),
    }),
    [viewMode]
  );

  return { layouts, breakpoints, columns };
};
