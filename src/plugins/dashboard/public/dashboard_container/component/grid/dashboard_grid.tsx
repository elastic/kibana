/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import sizeMe from 'react-sizeme';
import classNames from 'classnames';
import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/styles.css';
import React, { useCallback, useMemo, useRef } from 'react';
import ReactGridLayout, { Layout, ReactGridLayoutProps } from 'react-grid-layout';

import { ViewMode, EmbeddablePhaseEvent } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { useDashboardContainerContext } from '../../dashboard_container_renderer';
import { DashboardLoadedEventStatus, DashboardRenderPerformanceStats } from '../../types';
import { DASHBOARD_GRID_COLUMN_COUNT, DASHBOARD_GRID_HEIGHT } from '../../../dashboard_constants';
import { getPanelLayoutsAreEqual } from '../../embeddable/integrations/diff_state/dashboard_diffing_utils';

let lastValidGridSize = 0;

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
  size,
  isViewMode,
  layout,
  onLayoutChange,
  children,
  maximizedPanelId,
  useMargins,
}: {
  size: { width: number };
  isViewMode: boolean;
  layout: Layout[];
  onLayoutChange: ReactGridLayoutProps['onLayoutChange'];
  children: JSX.Element[];
  maximizedPanelId?: string;
  useMargins: boolean;
}) {
  // This is to prevent a bug where view mode changes when the panel is expanded.  View mode changes will trigger
  // the grid to re-render, but when a panel is expanded, the size will be 0. Minimizing the panel won't cause the
  // grid to re-render so it'll show a grid with a width of 0.
  lastValidGridSize = size.width > 0 ? size.width : lastValidGridSize;
  const classes = classNames({
    'dshLayout--viewing': isViewMode,
    'dshLayout--editing': !isViewMode,
    'dshLayout-isMaximizedPanel': maximizedPanelId !== undefined,
    'dshLayout-withoutMargins': !useMargins,
  });

  const MARGINS = useMargins ? 8 : 0;
  // We can't take advantage of isDraggable or isResizable due to performance concerns:
  // https://github.com/STRML/react-grid-layout/issues/240
  return (
    <ReactGridLayout
      width={lastValidGridSize}
      className={classes}
      isDraggable={true}
      isResizable={true}
      // There is a bug with d3 + firefox + elements using transforms.
      // See https://github.com/elastic/kibana/issues/16870 for more context.
      useCSSTransforms={false}
      margin={[MARGINS, MARGINS]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      // Pass the named classes of what should get the dragging handle
      draggableHandle={'.embPanel--dragHandle'}
      layout={layout}
      onLayoutChange={onLayoutChange}
      onResize={({}, {}, {}, {}, event) => ensureWindowScrollsToBottom(event)}
    >
      {children}
    </ReactGridLayout>
  );
}

// Using sizeMe sets up the grid to be re-rendered automatically not only when the window size changes, but also
// when the container size changes, so it works for Full Screen mode switches.
const config = { monitorWidth: true };
const ResponsiveSizedGrid = sizeMe(config)(ResponsiveGrid);

interface PanelLayout extends Layout {
  i: string;
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

  const layout = useMemo(() => Object.values(panels).map((panel) => panel.gridData), [panels]);
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
    (newLayout: PanelLayout[]) => {
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
    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

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
    <ResponsiveSizedGrid
      layout={layout}
      useMargins={useMargins}
      onLayoutChange={onLayoutChange}
      maximizedPanelId={expandedPanelId}
      isViewMode={viewMode === ViewMode.VIEW}
    >
      {dashboardPanels}
    </ResponsiveSizedGrid>
  );
};
