/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { GridLayoutData, GridPanelData } from '@kbn/grid-layout';
import { GridLayout } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../common/content_management/constants';
import type { GridData } from '../../../server/content_management';
import { areLayoutsEqual, type DashboardLayout } from '../../dashboard_api/layout_manager';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import {
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
} from './constants';
import { DashboardGridItem } from './dashboard_grid_item';
import { useLayoutStyles } from './use_layout_styles';

export const DashboardGrid = () => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const layoutStyles = useLayoutStyles();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});

  const [topOffset, setTopOffset] = useState(DEFAULT_DASHBOARD_DRAG_TOP_OFFSET);
  const [expandedPanelId, useMargins, viewMode, layout, dashboardContainerRef] =
    useBatchedPublishingSubjects(
      dashboardApi.expandedPanelId$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode$,
      dashboardInternalApi.gridLayout$,
      dashboardInternalApi.dashboardContainerRef$
    );

  useEffect(() => {
    const newTopOffset =
      dashboardContainerRef?.getBoundingClientRect().top ?? DEFAULT_DASHBOARD_DRAG_TOP_OFFSET;
    if (newTopOffset !== topOffset) setTopOffset(newTopOffset);
  }, [dashboardContainerRef, topOffset]);

  const appFixedViewport = useAppFixedViewport();

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
          data-grid-row={panels[id].gridData.y} // initialize data-grid-row
        />
      );
    },
    [appFixedViewport, dashboardInternalApi.layout$]
  );

  const styles = useMemoCss(dashboardGridStyles);

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
        layout={layout}
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
    layout,
    useMargins,
    renderPanelContents,
    onLayoutChange,
    expandedPanelId,
    viewMode,
    topOffset,
  ]);

  useEffect(() => {
    // update `data-grid-row` attribute for all panels because it is used for some styling
    Object.values(layout).forEach((widget) => {
      if (widget.type === 'panel') {
        const panelRef = panelRefs.current[widget.id];
        if (typeof panelRef !== 'function' && panelRef?.current) {
          panelRef.current.setAttribute('data-grid-row', `${widget.row}`);
        }
      }
    });
  }, [layout]);

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

        [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
          // on smaller screens, the maximized panel should take the full height of the screen minus the sticky top nav
          minHeight: 'calc(100vh - var(--kbn-application--sticky-headers-offset, 0px))',
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
          '.embPanel--dragHandle, ~.kbnGridPanel--resizeHandle': {
            visibility: 'hidden',
          },
        },
    }),
};
