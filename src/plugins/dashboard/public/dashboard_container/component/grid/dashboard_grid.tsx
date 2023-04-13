/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/styles.css';

import { pick } from 'lodash';
import classNames from 'classnames';
import { useEffectOnce } from 'react-use/lib';
import React, { useState, useMemo, useCallback } from 'react';
import { Layout, Responsive as ResponsiveReactGridLayout } from 'react-grid-layout';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { DASHBOARD_GRID_HEIGHT, DASHBOARD_MARGIN_SIZE } from '../../../dashboard_constants';
import { useDashboardGridSettings } from './use_dashboard_grid_settings';
import { useDashboardContainerContext } from '../../dashboard_container_context';
import { useDashboardPerformanceTracker } from './use_dashboard_performance_tracker';
import { getPanelLayoutsAreEqual } from '../../embeddable/integrations/diff_state/dashboard_diffing_utils';

export const DashboardGrid = ({ viewportWidth }: { viewportWidth: number }) => {
  const {
    useEmbeddableSelector: select,
    actions: { setPanels },
    useEmbeddableDispatch,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();
  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);
  const useMargins = select((state) => state.explicitInput.useMargins);
  const expandedPanelId = select((state) => state.componentState.expandedPanelId);

  // turn off panel transform animations for the first 500ms so that the dashboard doesn't animate on its first render.
  const [animatePanelTransforms, setAnimatePanelTransforms] = useState(false);
  useEffectOnce(() => {
    setTimeout(() => setAnimatePanelTransforms(true), 500);
  });

  const { onPanelStatusChange } = useDashboardPerformanceTracker({
    panelCount: Object.keys(panels).length,
  });

  const panelsInOrder: string[] = useMemo(() => {
    return Object.keys(panels).sort((embeddableIdA, embeddableIdB) => {
      const panelA = panels[embeddableIdA];
      const panelB = panels[embeddableIdB];

      // need to manually sort the panels by position because we want the panels to be collapsed from the left to the
      // right when switching to the single column layout, but RGL sorts by ID which can cause unexpected behaviour between
      // by-reference and by-value panels + we want the HTML order to align with this in the multi-panel view
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });
  }, [panels]);

  const panelComponents = useMemo(() => {
    return panelsInOrder.map((embeddableId, index) => {
      const type = panels[embeddableId].type;
      return (
        <DashboardGridItem
          data-grid={panels[embeddableId].gridData}
          key={embeddableId}
          id={embeddableId}
          index={index + 1}
          type={type}
          expandedPanelId={expandedPanelId}
          onPanelStatusChange={onPanelStatusChange}
        />
      );
    });
  }, [expandedPanelId, onPanelStatusChange, panels, panelsInOrder]);

  const onLayoutChange = useCallback(
    (newLayout: Array<Layout & { i: string }>) => {
      const updatedPanels: { [key: string]: DashboardPanelState } = newLayout.reduce(
        (updatedPanelsAcc, panelLayout) => {
          updatedPanelsAcc[panelLayout.i] = {
            ...panels[panelLayout.i],
            gridData: pick(panelLayout, ['x', 'y', 'w', 'h', 'i']),
          };
          return updatedPanelsAcc;
        },
        {} as { [key: string]: DashboardPanelState }
      );
      if (!getPanelLayoutsAreEqual(panels, updatedPanels)) {
        dispatch(setPanels(updatedPanels));
      }
    },
    [dispatch, panels, setPanels]
  );

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === ViewMode.VIEW,
    'dshLayout--editing': viewMode !== ViewMode.VIEW,
    'dshLayout--noAnimation': !animatePanelTransforms,
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  const { layouts, breakpoints, columns } = useDashboardGridSettings(panelsInOrder);

  // in print mode, dashboard layout is not controlled by React Grid Layout
  if (viewMode === ViewMode.PRINT) {
    return <>{panelComponents}</>;
  }

  return (
    <ResponsiveReactGridLayout
      cols={columns}
      layouts={layouts}
      className={classes}
      width={viewportWidth}
      breakpoints={breakpoints}
      onDragStop={onLayoutChange}
      onResizeStop={onLayoutChange}
      isResizable={!expandedPanelId}
      isDraggable={!expandedPanelId}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      margin={useMargins ? [DASHBOARD_MARGIN_SIZE, DASHBOARD_MARGIN_SIZE] : [0, 0]}
      draggableHandle={'.embPanel--dragHandle'}
    >
      {panelComponents}
    </ResponsiveReactGridLayout>
  );
};
