/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../common/content_management/constants';
import { arePanelLayoutsEqual } from '../../dashboard_api/are_panel_layouts_equal';
import { DashboardLayout } from '../../dashboard_api/types';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import {
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from './constants';
import { DashboardGridItem } from './dashboard_grid_item';
import { useLayoutStyles } from './use_layout_styles';

export const DashboardGrid = ({
  dashboardContainerRef,
}: {
  dashboardContainerRef?: React.MutableRefObject<HTMLElement | null>;
}) => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const layoutStyles = useLayoutStyles();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});
  const { euiTheme } = useEuiTheme();
  const firstRowId = useRef(uuidv4());

  const [expandedPanelId, layout, useMargins, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId$,
    dashboardInternalApi.layout$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode$
  );

  const appFixedViewport = useAppFixedViewport();

  const currentLayout: GridLayoutData = useMemo(() => {
    const singleRow: GridLayoutData = {};

    Object.keys(layout).forEach((panelId) => {
      const gridData = panels[panelId].gridData;
      singleRow[panelId] = {
        id: panelId,
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
        type: 'panel',
      };
      // update `data-grid-row` attribute for all panels because it is used for some styling
      const panelRef = panelRefs.current[panelId];
      if (typeof panelRef !== 'function' && panelRef?.current) {
        panelRef.current.setAttribute('data-grid-row', `${gridData.y}`);
      }
    });

    return singleRow ;
  }, [layout]);


  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

      const currentPanels = dashboardInternalApi.layout$.getValue();
      const updatedPanels: DashboardLayout = Object.values(
        newLayout[firstRowId.current].panels
      ).reduce((updatedPanelsAcc, widget) => {
        if (widget.type === 'section') {
          return updatedPanelsAcc; // sections currently aren't supported
        }
        updatedPanelsAcc[widget.id] = {
          ...currentPanels[widget.id],
          gridData: {
            i: widget.id,
            y: widget.row,
            x: widget.column,
            w: widget.width,
            h: widget.height,
          },
        };
        return updatedPanelsAcc;
      }, {} as DashboardLayout);

      if (!arePanelLayoutsEqual(currentPanels, updatedPanels)) {
        dashboardInternalApi.layout$.next(updatedPanels);
      }
    },
    [dashboardInternalApi.layout$, viewMode]
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = dashboardInternalApi.layout$.getValue();
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
    [appFixedViewport, dashboardContainerRef, dashboardInternalApi.layout$]
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
          keyboardDragTopLimit:
            dashboardContainerRef?.current?.getBoundingClientRect().top ||
            DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
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
    dashboardContainerRef,
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
