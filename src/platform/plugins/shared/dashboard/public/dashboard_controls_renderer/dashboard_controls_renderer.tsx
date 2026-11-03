/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/as-code-dashboard-schema';
import type { ControlsLayout } from '@kbn/controls-renderer';
import { FlexGridLayout, GridLayout } from '@kbn/grid-layout';
import type { PublishesDataLoading } from '@kbn/presentation-publishing';
import {
  apiPublishesDataLoading,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React, { useCallback, useEffect, useState } from 'react';
import { combineLatest, map, of, switchMap } from 'rxjs';
import type { DashboardLayout } from '../dashboard_api/layout_manager';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import {
  DASHBOARD_GRID_HEIGHT,
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
} from '../dashboard_renderer/grid/constants';
import { useDashboardInternalApi } from '../dashboard_api/use_dashboard_internal_api';
import { css } from '@emotion/react';

export const DashboardPinnedPanelsRenderer = () => {
  const dashboardInternalApi = useDashboardInternalApi();
  const [topOffset, setTopOffset] = useState(DEFAULT_DASHBOARD_DRAG_TOP_OFFSET);

  const [flexLayout] = useBatchedPublishingSubjects(dashboardInternalApi.pinnedLayout$);
  console.log({ flexLayout });
  return (
    <GridLayout
      layout={flexLayout}
      gridSettings={{
        gutterSize: 0,
        rowHeight: DASHBOARD_GRID_HEIGHT,
        columnCount: 12,
        keyboardDragTopLimit: 0,
      }}
      // useCustomDragHandle={true}
      renderPanelContents={() => {
        return <div>here</div>;
      }}
      onLayoutChange={() => {}}
      accessMode={'EDIT'}
    />
  );
};
