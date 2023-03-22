/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import classNames from 'classnames';
import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/styles.css';
import { useEffectOnce } from 'react-use/lib';
import React, { useCallback, useMemo, useState } from 'react';
import ReactGridLayout, { Layout } from 'react-grid-layout';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { useDashboardContainerContext } from '../../dashboard_container_context';
import { useDashboardPerformanceTracker } from './use_dashboard_performance_tracker';
import { DASHBOARD_GRID_COLUMN_COUNT, DASHBOARD_GRID_HEIGHT } from '../../../dashboard_constants';
import { getPanelLayoutsAreEqual } from '../../embeddable/integrations/diff_state/dashboard_diffing_utils';

export const DashboardGrid = ({ viewportWidth }: { viewportWidth: number }) => {
  const {
    actions: { setPanels },
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);
  const useMargins = select((state) => state.explicitInput.useMargins);
  const expandedPanelId = select((state) => state.componentState.expandedPanelId);

  // turn off panel transform animations for the first 50 ms so that the dashboard doesn't animate on its first render.
  const [animatePanelTransforms, setAnimatePanelTransforms] = useState(false);
  useEffectOnce(() => {
    setTimeout(() => setAnimatePanelTransforms(true), 50);
  });

  const layout = useMemo(() => Object.values(panels).map((panel) => panel.gridData), [panels]);
  const panelsInOrder = useMemo(
    () =>
      Object.keys(panels)
        .map((key: string) => panels[key])
        .sort((panelA, panelB) => {
          if (panelA.gridData.y === panelB.gridData.y) {
            return panelA.gridData.x - panelB.gridData.x;
          } else {
            return panelA.gridData.y - panelB.gridData.y;
          }
        }),
    [panels]
  );

  const onLayoutChange = useCallback(
    (newLayout: Array<Layout & { i: string }>) => {
      const updatedPanels: { [key: string]: DashboardPanelState } = newLayout.reduce(
        (updatedPanelsAcc, panelLayout) => {
          updatedPanelsAcc[panelLayout.i] = {
            ...panels[panelLayout.i],
            gridData: _.pick(panelLayout, ['x', 'y', 'w', 'h', 'i']),
          };
          return updatedPanelsAcc;
        },
        {} as { [key: string]: DashboardPanelState }
      );

      // onLayoutChange gets called by react grid layout a lot more than it should, so only dispatch the updated panels if the layout has actually changed
      if (!getPanelLayoutsAreEqual(panels, updatedPanels)) {
        dispatch(setPanels(updatedPanels));
      }
    },
    [dispatch, panels, setPanels]
  );

  const { onPanelStatusChange } = useDashboardPerformanceTracker({
    panelCount: panelsInOrder.length,
  });

  const dashboardPanels = useMemo(() => {
    return panelsInOrder.map(({ explicitInput, type }, index) => (
      <DashboardGridItem
        key={explicitInput.id}
        id={explicitInput.id}
        index={index + 1}
        type={type}
        expandedPanelId={expandedPanelId}
        onPanelStatusChange={onPanelStatusChange}
      />
    ));
  }, [expandedPanelId, panelsInOrder, onPanelStatusChange]);

  // in print mode, dashboard layout is not controlled by React Grid Layout
  if (viewMode === ViewMode.PRINT) {
    return <>{dashboardPanels}</>;
  }

  const classes = classNames({
    'dshLayout--noanimation': !animatePanelTransforms,
    'dshLayout--viewing': viewMode === ViewMode.VIEW,
    'dshLayout--editing': viewMode !== ViewMode.VIEW,
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
    'dshLayout-withoutMargins': !useMargins,
  });

  const MARGINS = useMargins ? 8 : 0;

  return (
    <ReactGridLayout
      width={viewportWidth}
      className={classes}
      isDraggable={!expandedPanelId}
      isResizable={!expandedPanelId}
      margin={[MARGINS, MARGINS]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      // Pass the named classes of what should get the dragging handle
      draggableHandle={'.embPanel--dragHandle'}
      layout={layout}
      onLayoutChange={onLayoutChange}
    >
      {dashboardPanels}
    </ReactGridLayout>
  );
};
