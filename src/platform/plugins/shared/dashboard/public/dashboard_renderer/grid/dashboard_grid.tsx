/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import deepEqual from 'fast-deep-equal';
import { omit } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { DashboardPanelState } from '../../../common';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../common/content_management/constants';
import { DashboardSectionMap } from '../../../common/dashboard_container/types';
import { arePanelLayoutsEqual } from '../../dashboard_api/are_panel_layouts_equal';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
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
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});
  const { euiTheme } = useEuiTheme();
  const firstRowId = useRef(uuidv4());

  const [expandedPanelId, panels, sections, useMargins, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId$,
    dashboardApi.panels$,
    dashboardApi.sections$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode$
  );

  const appFixedViewport = useAppFixedViewport();

  const currentLayout: GridLayoutData = useMemo(() => {
    const newLayout: GridLayoutData = {
      [firstRowId.current]: {
        id: firstRowId.current,
        title: '', // first, non-collapsible section
        isCollapsed: false,
        order: 0,
        panels: {},
      },
    };

    (sections ?? []).forEach((section) => {
      const sectionId = section.id ?? uuidv4();
      newLayout[sectionId] = {
        id: sectionId,
        title: section.title,
        isCollapsed: section.collapsed,
        order: section.order,
        panels: {},
      };
    });

    Object.keys(panels).forEach((panelId) => {
      const gridData = panels[panelId].gridData;
      const sectionId = gridData.sectionId ?? firstRowId.current;
      newLayout[sectionId].panels[panelId] = {
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
    return newLayout;
  }, [panels, sections]);

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

      const currentPanels = dashboardApi.panels$.getValue();
      const currentSections = dashboardApi.sections$.getValue();

      const updatedSections: DashboardSectionMap = [];
      const updatedPanels: { [key: string]: DashboardPanelState } = {};
      Object.values(newLayout).forEach((section) => {
        const sectionIndex = section.id;
        if (section.order !== 0) {
          updatedSections.push({
            title: section.title,
            collapsed: section.isCollapsed,
            order: section.order,
            id: sectionIndex,
          });
        }

        Object.values(section.panels).forEach((panelLayout) => {
          updatedPanels[panelLayout.id] = {
            ...omit(currentPanels[panelLayout.id], 'sectionIndex'),
            gridData: {
              i: panelLayout.id,
              y: panelLayout.row,
              x: panelLayout.column,
              w: panelLayout.width,
              h: panelLayout.height,
              ...(sectionIndex !== firstRowId.current && { sectionId: sectionIndex }),
            },
          };
        });
      });

      if (!arePanelLayoutsEqual(currentPanels, updatedPanels)) {
        dashboardApi.setPanels(updatedPanels);
      }
      if (!deepEqual(currentSections ?? [], updatedSections ?? [])) {
        dashboardApi.setSections(updatedSections);
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

  useEffect(() => {
    const scrollToBottomOnResize = new ResizeObserver(() => {
      setTimeout(dashboardApi.scrollToBottom, 1);
      scrollToBottomOnResize.disconnect();
    });

    const scrollToBottomSubscription = dashboardApi.scrollToBottom$.subscribe(() => {
      if (!layoutRef.current) return;
      scrollToBottomOnResize.observe(layoutRef.current);
    });
    return () => {
      scrollToBottomOnResize.disconnect();
      scrollToBottomSubscription.unsubscribe();
    };
  }, [dashboardApi]);

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
    <div ref={layoutRef} className={dashboardClasses} css={dashboardStyles}>
      {memoizedgridLayout}
    </div>
  );
};
