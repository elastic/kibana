/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { GridLayout, GridPanelData, GridSectionData, type GridLayoutData } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import classNames from 'classnames';
import { default as React, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoizedStyles } from '@kbn/core/public';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../common/content_management/constants';
import { GridData } from '../../../common/content_management/v2/types';
import { areLayoutsEqual } from '../../dashboard_api/are_layouts_equal';
import { DashboardLayout } from '../../dashboard_api/types';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import {
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
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
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const layoutStyles = useLayoutStyles();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});

  const [topOffset, setTopOffset] = useState(DEFAULT_DASHBOARD_DRAG_TOP_OFFSET);
  const [expandedPanelId, layout, useMargins, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId$,
    dashboardInternalApi.layout$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode$
  );

  useEffect(() => {
    setTopOffset(
      dashboardContainerRef?.current?.getBoundingClientRect().top ??
        DEFAULT_DASHBOARD_DRAG_TOP_OFFSET
    );
  }, [dashboardContainerRef]);

  const appFixedViewport = useAppFixedViewport();

  const currentLayout: GridLayoutData = useMemo(() => {
    const newLayout: GridLayoutData = {};
    Object.keys(layout.sections).forEach((sectionId) => {
      const section = layout.sections[sectionId];
      newLayout[sectionId] = {
        id: sectionId,
        type: 'section',
        row: section.gridData.y,
        isCollapsed: Boolean(section.collapsed),
        title: section.title,
        panels: {},
      };
    });
    Object.keys(layout.panels).forEach((panelId) => {
      const gridData = layout.panels[panelId].gridData;
      const basePanel = {
        id: panelId,
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
      } as GridPanelData;
      if (gridData.sectionId) {
        (newLayout[gridData.sectionId] as GridSectionData).panels[panelId] = basePanel;
      } else {
        newLayout[panelId] = {
          ...basePanel,
          type: 'panel',
        };
      }
      // update `data-grid-row` attribute for all panels because it is used for some styling
      const panelRef = panelRefs.current[panelId];
      if (typeof panelRef !== 'function' && panelRef?.current) {
        panelRef.current.setAttribute('data-grid-row', `${gridData.y}`);
      }
    });
    return newLayout;
  }, [layout]);

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

      const currLayout = dashboardInternalApi.layout$.getValue();
      const updatedLayout: DashboardLayout = {
        sections: {},
        panels: {},
      };
      Object.values(newLayout).forEach((widget) => {
        if (widget.type === 'section') {
          updatedLayout.sections[widget.id] = {
            collapsed: widget.isCollapsed,
            title: widget.title,
            id: widget.id,
            gridData: {
              i: widget.id,
              y: widget.row,
            },
          };
          Object.values(widget.panels).forEach((panel) => {
            updatedLayout.panels[panel.id] = {
              ...currLayout.panels[panel.id],
              gridData: {
                ...convertGridPanelToDashboardGridData(panel),
                sectionId: widget.id,
              },
            };
          });
        } else {
          // widget is a panel
          updatedLayout.panels[widget.id] = {
            ...currLayout.panels[widget.id],
            gridData: convertGridPanelToDashboardGridData(widget),
          };
        }
      });
      if (!areLayoutsEqual(currLayout, updatedLayout)) {
        dashboardInternalApi.layout$.next(updatedLayout);
      }
    },
    [dashboardInternalApi.layout$, viewMode]
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const panels = dashboardInternalApi.layout$.getValue().panels;
      if (!panels[id]) return;

      if (!panelRefs.current[id]) {
        panelRefs.current[id] = React.createRef();
      }

      const type = panels[id].type;
      return (
        <DashboardGridItem
          ref={panelRefs.current[id]}
          key={id}
          id={id}
          type={type}
          setDragHandles={setDragHandles}
          appFixedViewport={appFixedViewport}
          dashboardContainerRef={dashboardContainerRef}
          data-grid-row={panels[id].gridData.y} // initialize data-grid-row
        />
      );
    },
    [appFixedViewport, dashboardContainerRef, dashboardInternalApi.layout$]
  );

  const styles = useMemoizedStyles(dashboardGridStyles);

  useEffect(() => {
    /**
     * ResizeObserver fires the callback on `.observe()` with the initial size of the observed
     * element; we want to ignore this first call and scroll to the bottom on the **second**
     * callback - i.e. after the row is actually added to the DOM
     */
    let first = false;
    const scrollToBottomOnResize = new ResizeObserver(() => {
      if (first) {
        first = false;
      } else {
        dashboardApi.scrollToBottom();
        scrollToBottomOnResize.disconnect(); // once scrolled, stop observing resize events
      }
    });

    /**
     * When `scrollToBottom$` emits, wait for the `layoutRef` size to change then scroll
     * to the bottom of the screen
     */
    const scrollToBottomSubscription = dashboardApi.scrollToBottom$.subscribe(() => {
      if (!layoutRef.current) return;
      first = true; // ensure that only the second resize callback actually triggers scrolling
      scrollToBottomOnResize.observe(layoutRef.current);
    });

    return () => {
      scrollToBottomOnResize.disconnect();
      scrollToBottomSubscription.unsubscribe();
    };
  }, [dashboardApi]);

  const memoizedGridLayout = useMemo(() => {
    // memoizing this component reduces the number of times it gets re-rendered to a minimum
    return (
      <GridLayout
        css={layoutStyles}
        layout={currentLayout}
        gridSettings={{
          gutterSize: useMargins ? DASHBOARD_MARGIN_SIZE : 0,
          rowHeight: DASHBOARD_GRID_HEIGHT,
          columnCount: DASHBOARD_GRID_COLUMN_COUNT,
          keyboardDragTopLimit: topOffset,
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
    topOffset,
  ]);

  return (
    <div
      ref={layoutRef}
      className={classNames(viewMode === 'edit' ? 'dshLayout--editing' : 'dshLayout--viewing', {
        'dshLayout-withoutMargins': !useMargins,
        'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
      })}
      css={styles.dashboard}
    >
      {memoizedGridLayout}
    </div>
  );
};

const convertGridPanelToDashboardGridData = (panel: GridPanelData): GridData => {
  return {
    i: panel.id,
    y: panel.row,
    x: panel.column,
    w: panel.width,
    h: panel.height,
  };
};

const dashboardGridStyles = {
  dashboard: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      // for dashboards with no controls, increase the z-index of the hover actions in the
      // top row so that they overlap the sticky nav in Dashboard
      ".dshDashboardViewportWrapper:not(:has(.dshDashboardViewport-controls)) & .dshDashboardGrid__item[data-grid-row='0'] .embPanel__hoverActions":
        {
          zIndex: euiTheme.levels.toast,
        },

      // Hide hover actions when dashboard has an overlay
      '.dshDashboardGrid__item--blurred .embPanel__hoverActions, .dshDashboardGrid__item--focused .embPanel__hoverActions':
        {
          visibility: 'hidden !important' as 'hidden',
        },
      '&.dshLayout-isMaximizedPanel': {
        height: '100%', // need to override the kbn-grid-layout height when a single panel is expanded
        '.dshDashboardGrid__item--expanded': {
          position: 'absolute',
          width: '100%',
        },
      },
      // LAYOUT MODES
      // Adjust borders/etc... for non-spaced out and expanded panels
      '&.dshLayout-withoutMargins': {
        paddingTop: euiTheme.size.s,
        '.embPanel__content, .embPanel, .embPanel__hoverActionsAnchor, .lnsExpressionRenderer': {
          borderRadius: 0,
        },
        '.embPanel__content, .embPanel__header': {
          backgroundColor: euiTheme.colors.backgroundBasePlain,
        },
      },
      // drag handle visibility when dashboard is in edit mode or a panel is expanded
      '&.dshLayout-withoutMargins:not(.dshLayout--editing), .dshDashboardGrid__item--expanded, .dshDashboardGrid__item--blurred, .dshDashboardGrid__item--focused':
        {
          '.embPanel--dragHandle': {
            visibility: 'hidden',
          },
        },
    }),
};
