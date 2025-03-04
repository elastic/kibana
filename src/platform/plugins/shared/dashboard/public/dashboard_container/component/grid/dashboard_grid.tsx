/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useMemo, useRef } from 'react';

import { css } from '@emotion/react';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { useEuiTheme } from '@elastic/eui';
import { DashboardPanelState } from '../../../../common';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../../common/content_management/constants';
import { arePanelLayoutsEqual } from '../../../dashboard_api/are_panel_layouts_equal';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { DASHBOARD_GRID_HEIGHT, DASHBOARD_MARGIN_SIZE } from './constants';
import { DashboardGridItem } from './dashboard_grid_item';
import { useLayoutStyles } from './use_layout_styles';

export const DashboardGrid = ({
  dashboardContainerRef,
}: {
  dashboardContainerRef?: React.MutableRefObject<HTMLElement | null>;
}) => {
  const dashboardApi = useDashboardApi();
  const layoutStyles = useLayoutStyles();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});
  const { euiTheme } = useEuiTheme();

  const [expandedPanelId, panels, useMargins, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId$,
    dashboardApi.panels$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode$
  );

  const appFixedViewport = useAppFixedViewport();

  const currentLayout: GridLayoutData = useMemo(() => {
    const singleRow: GridLayoutData[number] = {
      title: '', // we only support a single section currently, and it does not have a title
      isCollapsed: false,
      panels: {},
    };

    Object.keys(panels).forEach((panelId) => {
      const gridData = panels[panelId].gridData;
      singleRow.panels[panelId] = {
        id: panelId,
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
      };
      // update `data-grid-row` attribute for all panels because it is used for some styling
      const panelRef = panelRefs.current[panelId];
      if (typeof panelRef !== 'function' && panelRef?.current) {
        panelRef.current.setAttribute('data-grid-row', `${gridData.y}`);
      }
    });

    return [singleRow];
  }, [panels]);

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

      const currentPanels = dashboardApi.panels$.getValue();
      const updatedPanels: { [key: string]: DashboardPanelState } = Object.values(
        newLayout[0].panels
      ).reduce((updatedPanelsAcc, panelLayout) => {
        updatedPanelsAcc[panelLayout.id] = {
          ...currentPanels[panelLayout.id],
          gridData: {
            i: panelLayout.id,
            y: panelLayout.row,
            x: panelLayout.column,
            w: panelLayout.width,
            h: panelLayout.height,
          },
        };
        return updatedPanelsAcc;
      }, {} as { [key: string]: DashboardPanelState });
      if (!arePanelLayoutsEqual(currentPanels, updatedPanels)) {
        dashboardApi.setPanels(updatedPanels);
      }
    },
    [dashboardApi, viewMode]
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = dashboardApi.panels$.getValue();
      if (!currentPanels[id]) return;

      if (!panelRefs.current[id]) {
        panelRefs.current[id] = React.createRef();
      }
      const type = currentPanels[id].type;
      return (
        <DashboardGridItem
          ref={panelRefs.current[id]}
          key={id}
          id={id}
          type={type}
          setDragHandles={setDragHandles}
          appFixedViewport={appFixedViewport}
          dashboardContainerRef={dashboardContainerRef}
          data-grid-row={currentPanels[id].gridData.y} // initialize data-grid-row
        />
      );
    },
    [appFixedViewport, dashboardApi, dashboardContainerRef]
  );

  const memoizedgridLayout = useMemo(() => {
    // memoizing this component reduces the number of times it gets re-rendered to a minimum
    return (
      <GridLayout
        css={layoutStyles}
        layout={currentLayout}
        gridSettings={{
          gutterSize: useMargins ? DASHBOARD_MARGIN_SIZE : 0,
          rowHeight: DASHBOARD_GRID_HEIGHT,
          columnCount: DASHBOARD_GRID_COLUMN_COUNT,
        }}
        useCustomDragHandle={true}
        renderPanelContents={renderPanelContents}
        onLayoutChange={onLayoutChange}
        expandedPanelId={expandedPanelId}
        accessMode={viewMode === 'edit' ? 'EDIT' : 'VIEW'}
      />
    );
  }, [
    layoutStyles,
    currentLayout,
    useMargins,
    renderPanelContents,
    onLayoutChange,
    expandedPanelId,
    viewMode,
  ]);

  const { dashboardClasses, dashboardStyles } = useMemo(() => {
    return {
      dashboardClasses: classNames({
        'dshLayout-withoutMargins': !useMargins,
        'dshLayout--viewing': viewMode === 'view',
        'dshLayout--editing': viewMode !== 'view',
        'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
      }),
      dashboardStyles: css`
        // for dashboards with no controls, increase the z-index of the hover actions in the
        // top row so that they overlap the sticky nav in Dashboard
        .dshDashboardViewportWrapper:not(:has(.dshDashboardViewport-controls))
          &
          .dshDashboardGrid__item[data-grid-row='0']
          .embPanel__hoverActions {
          z-index: ${euiTheme.levels.toast};
        }

        // when in fullscreen mode, combine all floating actions on first row and nudge them down
      `,
    };
  }, [useMargins, viewMode, expandedPanelId, euiTheme.levels.toast]);

  return (
    <div className={dashboardClasses} css={dashboardStyles}>
      {memoizedgridLayout}
    </div>
  );
};
