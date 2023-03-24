/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../dashboard_constants';
import { useDashboardContainerContext } from '../../dashboard_container_context';

export const useDashboardGridSettings = () => {
  const { useEmbeddableSelector: select } = useDashboardContainerContext();

  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);

  const layouts = useMemo(() => {
    const fullwidthLayout = Object.values(panels).map((panel) => panel.gridData);
    return {
      lg: fullwidthLayout,
    };
  }, [panels]);

  // { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
  // ...(viewMode === ViewMode.VIEW ? { sm: 768 } : {})
  const breakpoints = useMemo(
    () => ({ lg: 768, ...(viewMode === ViewMode.VIEW ? { sm: 0 } : {}) }),
    [viewMode]
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
