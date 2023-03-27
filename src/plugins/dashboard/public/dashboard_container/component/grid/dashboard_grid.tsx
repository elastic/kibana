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
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Responsive,
  Layout,
  ResponsiveProps as ReactGridResponsiveProps,
  WidthProvider,
} from 'react-grid-layout';

import { ViewMode, EmbeddablePhaseEvent } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { useDashboardContainerContext } from '../../dashboard_container_context';
import { DashboardLoadedEventStatus, DashboardRenderPerformanceStats } from '../../types';
import { DASHBOARD_GRID_COLUMN_COUNT, DASHBOARD_GRID_HEIGHT } from '../../../dashboard_constants';
import { getPanelLayoutsAreEqual } from '../../embeddable/integrations/diff_state/dashboard_diffing_utils';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

/**
 * This is a fix for a bug that stopped the browser window from automatically scrolling down when panels were made
 * taller than the current grid.
 * see https://github.com/elastic/kibana/issues/14710.
 */
function ensureWindowScrollsToBottom(event: { clientY: number; pageY: number }) {
  // The buffer is to handle the case where the browser is maximized and it's impossible for the mouse to move below
  // the screen, out of the window.  see https://github.com/elastic/kibana/issues/14737
  const WINDOW_BUFFER = 10;
  if (event.clientY > window.innerHeight - WINDOW_BUFFER) {
    window.scrollTo(0, event.pageY + WINDOW_BUFFER - window.innerHeight);
  }
}

function ResponsiveGrid({
  isViewMode,
  layout,
  onLayoutChange,
  children,
  maximizedPanelId,
  useMargins,
}: {
  isViewMode: boolean;
  layout: Layout[];
  onLayoutChange: ReactGridResponsiveProps['onLayoutChange'];
  children: JSX.Element[];
  maximizedPanelId?: string;
  useMargins: boolean;
}) {
  const classes = classNames({
    'dshLayout--viewing': isViewMode,
    'dshLayout--editing': !isViewMode,
    'dshLayout-isMaximizedPanel': maximizedPanelId !== undefined,
    'dshLayout-withoutMargins': !useMargins,
  });

  const MARGINS = useMargins ? 8 : 0;

  return (
    <ResponsiveReactGridLayout
      className={classes}
      isDraggable={!maximizedPanelId}
      isResizable={!maximizedPanelId}
      // There is a bug with d3 + firefox + elements using transforms.
      // See https://github.com/elastic/kibana/issues/16870 for more context.
      useCSSTransforms={false}
      margin={[MARGINS, MARGINS]}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      // Pass the named classes of what should get the dragging handle
      draggableHandle={'.embPanel--dragHandle'}
      breakpoints={isViewMode ? { xs: 752, xxs: 0 } : { xs: 0 }}
      cols={
        isViewMode
          ? { xs: DASHBOARD_GRID_COLUMN_COUNT, xxs: 1 }
          : { xs: DASHBOARD_GRID_COLUMN_COUNT }
      }
      layouts={{ xs: layout }}
      onLayoutChange={isViewMode ? undefined : onLayoutChange} // we only care about layout changes in edit mode
      onResize={({}, {}, {}, {}, event) => ensureWindowScrollsToBottom(event)}
    >
      {children}
    </ResponsiveReactGridLayout>
  );
}

type DashboardRenderPerformanceTracker = DashboardRenderPerformanceStats & {
  panelIds: Record<string, Record<string, number>>;
  status: DashboardLoadedEventStatus;
  doneCount: number;
};

const getDefaultPerformanceTracker: () => DashboardRenderPerformanceTracker = () => ({
  panelsRenderStartTime: performance.now(),
  panelsRenderDoneTime: 0,
  lastTimeToData: 0,

  panelIds: {},
  doneCount: 0,
  status: 'done',
});

export const DashboardGrid = () => {
  const {
    actions: { setPanels },
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    embeddableInstance: dashboardContainer,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);
  const useMargins = select((state) => state.explicitInput.useMargins);
  const expandedPanelId = select((state) => state.componentState.expandedPanelId);

  const layout = useMemo(
    () =>
      Object.values(panels)
        .map((panel) => panel.gridData)
        .sort((panelA, panelB) => {
          if (panelA.y === panelB.y) {
            return panelA.x - panelB.x;
          } else {
            return panelA.y - panelB.y;
          }
        }),
    [panels]
  );
  const panelsInOrder = useMemo(
    () => Object.keys(panels).map((key: string) => panels[key]),
    [panels]
  );

  // reset performance tracker on each render.
  const performanceRefs = useRef<DashboardRenderPerformanceTracker>(getDefaultPerformanceTracker());
  performanceRefs.current = getDefaultPerformanceTracker();

  const onPanelStatusChange = useCallback(
    (info: EmbeddablePhaseEvent) => {
      if (performanceRefs.current.panelIds[info.id] === undefined || info.status === 'loading') {
        performanceRefs.current.panelIds[info.id] = {};
      } else if (info.status === 'error') {
        performanceRefs.current.status = 'error';
      } else if (info.status === 'loaded') {
        performanceRefs.current.lastTimeToData = performance.now();
      }

      performanceRefs.current.panelIds[info.id][info.status] = performance.now();

      if (info.status === 'error' || info.status === 'rendered') {
        performanceRefs.current.doneCount++;
        if (performanceRefs.current.doneCount === panelsInOrder.length) {
          performanceRefs.current.panelsRenderDoneTime = performance.now();
          dashboardContainer.reportPerformanceMetrics(performanceRefs.current);
        }
      }
    },
    [dashboardContainer, panelsInOrder.length]
  );

  const onLayoutChange = useCallback(
    (newLayout: Layout[]) => {
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

  return (
    <ResponsiveGrid
      layout={layout}
      useMargins={useMargins}
      onLayoutChange={onLayoutChange}
      maximizedPanelId={expandedPanelId}
      isViewMode={viewMode === ViewMode.VIEW}
    >
      {dashboardPanels}
    </ResponsiveGrid>
  );
};
