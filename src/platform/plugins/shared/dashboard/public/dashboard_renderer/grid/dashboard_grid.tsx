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

import type { GridData } from '@kbn/as-code-dashboard-schema';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../common/page_bundle_constants';
import { areLayoutsEqual, type DashboardLayout } from '../../dashboard_api/layout_manager';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import {
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
  SELECTION_DRAG_THRESHOLD_PX,
} from './constants';
import { DashboardGridItem } from './dashboard_grid_item';
import {
  PanelContextMenu,
  PanelContextMenuContext,
  SelectionPreviewContext,
} from './panel_context_menu';
import { isSelectionModifierPressed } from './selection_modifier';
import { isDragAreaClick, PanelClickHint } from './panel_click_hint';
import { useLayoutStyles } from './use_layout_styles';

function getAllPanelIdsFromLayout(layout: GridLayoutData): string[] {
  const ids: string[] = [];
  Object.values(layout).forEach((widget) => {
    if ('panels' in widget && widget.panels) {
      ids.push(...Object.keys(widget.panels));
    } else {
      ids.push((widget as GridPanelData).id);
    }
  });
  return ids;
}

function rectsIntersect(
  sel: { left: number; top: number; right: number; bottom: number },
  panel: DOMRect
): boolean {
  return !(
    sel.right < panel.left ||
    sel.left > panel.right ||
    sel.bottom < panel.top ||
    sel.top > panel.bottom
  );
}

/** Keeps the hint clear of the top of the window when the panel's top is scrolled out of view */
const MIN_CLICK_HINT_ANCHOR_TOP = 48;

export const DashboardGrid = () => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const justDidSelectionDragRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const layoutStyles = useLayoutStyles();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});

  const [topOffset, setTopOffset] = useState(DEFAULT_DASHBOARD_DRAG_TOP_OFFSET);
  const [contextMenu, setContextMenu] = useState<{
    panelId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [selectionDrag, setSelectionDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);
  const [previewSelectedPanelIds, setPreviewSelectedPanelIds] = useState<Set<string>>(new Set());
  const [clickHint, setClickHint] = useState<{
    id: number;
    position: { x: number; y: number };
  } | null>(null);
  const [
    expandedPanelId,
    useMargins,
    viewMode,
    layout,
    dashboardContainerRef,
    selectedPanelIds,
    isSelectMode,
  ] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode$,
    dashboardInternalApi.gridLayout$,
    dashboardInternalApi.dashboardContainerRef$,
    dashboardApi.selectedPanelIds$,
    dashboardApi.isSelectMode$
  );
  const panelContextMenuValue = useMemo(
    () => ({
      openContextMenu: (panelId: string, position: { x: number; y: number }) => {
        setContextMenu({ panelId, position });
      },
    }),
    []
  );

  const getPanelsInRect = useCallback(
    (rect: { left: number; top: number; right: number; bottom: number }) => {
      const ids: string[] = [];
      const panelIds = getAllPanelIdsFromLayout(layout);
      panelIds.forEach((id) => {
        const ref = panelRefs.current[id];
        if (typeof ref !== 'function' && ref?.current) {
          const bounds = ref.current.getBoundingClientRect();
          if (rectsIntersect(rect, bounds)) ids.push(id);
        }
      });
      return ids;
    },
    [layout]
  );

  // While the selection modifier is held, a click or drag selects panels, so panel content stops
  // reacting to the pointer (no chart tooltips or brushing under a Cmd+click)
  const [isSelectionModifierHeld, setIsSelectionModifierHeld] = useState(false);
  useEffect(() => {
    if (viewMode !== 'edit') return;
    const onKeyChange = (e: KeyboardEvent) =>
      setIsSelectionModifierHeld(isSelectionModifierPressed(e));
    const onBlur = () => setIsSelectionModifierHeld(false);
    document.addEventListener('keydown', onKeyChange, true);
    document.addEventListener('keyup', onKeyChange, true);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyChange, true);
      document.removeEventListener('keyup', onKeyChange, true);
      window.removeEventListener('blur', onBlur);
      setIsSelectionModifierHeld(false);
    };
  }, [viewMode]);

  const dragStateRef = useRef<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (viewMode !== 'edit') return;
      const panel = (e.target as HTMLElement).closest('[data-test-subj="dashboardPanel"]');
      if (panel) {
        // Cmd+clicks never get here, the panel handles them in the capture phase. A plain click on
        // the drag area hints at Cmd+click, since that's where users try to select a panel.
        const pointerDown = pointerDownRef.current;
        const hasMoved =
          pointerDown !== null &&
          (Math.abs(e.clientX - pointerDown.x) >= SELECTION_DRAG_THRESHOLD_PX ||
            Math.abs(e.clientY - pointerDown.y) >= SELECTION_DRAG_THRESHOLD_PX);
        // in select mode the user already knows how to select, so the hint would only be noise
        if (!hasMoved && !isSelectMode && isDragAreaClick(e, panel)) {
          const { left, width, top } = panel.getBoundingClientRect();
          setClickHint({
            id: Date.now(),
            // top center of the panel, near where the user clicked, kept on screen when the panel's
            // top is scrolled out of view
            position: { x: left + width / 2, y: Math.max(top, MIN_CLICK_HINT_ANCHOR_TOP) },
          });
        }
        return;
      }
      if (!isSelectMode) return;
      dashboardApi.setSelectedPanelIds(new Set());
    },
    [viewMode, isSelectMode, dashboardApi]
  );

  const dismissClickHint = useCallback(() => setClickHint(null), []);
  useEffect(() => {
    if (isSelectMode) setClickHint(null);
  }, [isSelectMode]);

  // The click that ends a selection drag must not reach the panel, or its Cmd+click handler
  // would immediately toggle off the panel the drag just selected
  const handleGridClickCapture = useCallback((e: React.MouseEvent) => {
    if (!justDidSelectionDragRef.current) return;
    justDidSelectionDragRef.current = false;
    e.stopPropagation();
  }, []);

  const handleGridMouseDown = useCallback(
    (e: React.MouseEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY };
      if (viewMode !== 'edit' || e.button !== 0) return;
      const target = e.target as HTMLElement;
      const isModifierDrag = isSelectionModifierPressed(e);
      // in select mode a plain drag selects too, while buttons (e.g. section headers) keep working
      const isSelectModeDrag =
        isSelectMode && !target.closest('button, a, [role="button"], .kbnGridPanel--resizeHandle');
      if (!isModifierDrag && !isSelectModeDrag) return;
      // keep native modifier+click behavior inside editable fields
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      // prevent the browser from selecting text across the page while dragging
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      justDidSelectionDragRef.current = false;
      const start = { x: e.clientX, y: e.clientY };

      const onMove = (moveEvent: MouseEvent) => {
        if (dragStateRef.current) {
          dragStateRef.current = {
            ...dragStateRef.current,
            current: { x: moveEvent.clientX, y: moveEvent.clientY },
          };
          setSelectionDrag((prev) =>
            prev ? { ...prev, current: { x: moveEvent.clientX, y: moveEvent.clientY } } : null
          );
          return;
        }
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        const hasDragged =
          Math.abs(dx) >= SELECTION_DRAG_THRESHOLD_PX ||
          Math.abs(dy) >= SELECTION_DRAG_THRESHOLD_PX;
        if (hasDragged) {
          dragStateRef.current = {
            start: { ...start },
            current: { x: moveEvent.clientX, y: moveEvent.clientY },
          };
          setSelectionDrag({
            start: { ...start },
            current: { x: moveEvent.clientX, y: moveEvent.clientY },
          });
        }
      };

      const onUp = () => {
        const state = dragStateRef.current;
        if (state) {
          const left = Math.min(state.start.x, state.current.x);
          const top = Math.min(state.start.y, state.current.y);
          const right = Math.max(state.start.x, state.current.x);
          const bottom = Math.max(state.start.y, state.current.y);
          const ids = getPanelsInRect({ left, top, right, bottom });
          // a drag adds to the selection, so it can grow a Cmd+click selection
          dashboardApi.setSelectedPanelIds(
            new Set([...dashboardApi.selectedPanelIds$.value, ...ids])
          );
          // a drag over empty space doesn't leave select mode
          if (isSelectMode) dashboardApi.enterSelectMode();
          dragStateRef.current = null;
          setSelectionDrag(null);
          setPreviewSelectedPanelIds(new Set());
          justDidSelectionDragRef.current = true;
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [viewMode, isSelectMode, getPanelsInRect, dashboardApi]
  );

  useEffect(() => {
    if (!selectionDrag) {
      setPreviewSelectedPanelIds(new Set());
      return;
    }
    const left = Math.min(selectionDrag.start.x, selectionDrag.current.x);
    const top = Math.min(selectionDrag.start.y, selectionDrag.current.y);
    const right = Math.max(selectionDrag.start.x, selectionDrag.current.x);
    const bottom = Math.max(selectionDrag.start.y, selectionDrag.current.y);
    const ids = getPanelsInRect({ left, top, right, bottom });
    setPreviewSelectedPanelIds(new Set(ids));
  }, [selectionDrag, getPanelsInRect]);

  useEffect(() => {
    const newTopOffset =
      dashboardContainerRef?.getBoundingClientRect().top ?? DEFAULT_DASHBOARD_DRAG_TOP_OFFSET;
    if (newTopOffset !== topOffset) setTopOffset(newTopOffset);
  }, [dashboardContainerRef, topOffset]);

  const appFixedViewport = useAppFixedViewport();

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

      const currLayout = dashboardApi.layout$.getValue();
      const updatedLayout: DashboardLayout = {
        sections: {},
        panels: {},
        pinnedPanels: currLayout.pinnedPanels,
      };
      Object.values(newLayout).forEach((widget) => {
        if (widget.type === 'section') {
          updatedLayout.sections[widget.id] = {
            collapsed: widget.isCollapsed,
            title: widget.title,
            grid: {
              y: widget.row,
            },
          };
          Object.values(widget.panels).forEach((panel) => {
            updatedLayout.panels[panel.id] = {
              ...currLayout.panels[panel.id],
              grid: {
                ...convertGridPanelToDashboardGridData(panel),
                sectionId: widget.id,
              },
            };
          });
        } else {
          // widget is a panel
          updatedLayout.panels[widget.id] = {
            ...currLayout.panels[widget.id],
            grid: convertGridPanelToDashboardGridData(widget),
          };
        }
      });
      if (!areLayoutsEqual(currLayout, updatedLayout)) {
        dashboardApi.layout$.next(updatedLayout);
      }
    },
    [dashboardApi.layout$, viewMode]
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const panels = dashboardApi.layout$.getValue().panels;
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
          data-grid-row={panels[id].grid.y} // initialize data-grid-row
        />
      );
    },
    [appFixedViewport, dashboardApi.layout$]
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
        selectedPanelIds={selectedPanelIds ?? undefined}
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
    selectedPanelIds,
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

  const selectionRect = selectionDrag
    ? (() => {
        const left = Math.min(selectionDrag.start.x, selectionDrag.current.x);
        const top = Math.min(selectionDrag.start.y, selectionDrag.current.y);
        const right = Math.max(selectionDrag.start.x, selectionDrag.current.x);
        const bottom = Math.max(selectionDrag.start.y, selectionDrag.current.y);
        return { left, top, width: right - left, height: bottom - top };
      })()
    : null;

  return (
    <PanelContextMenuContext.Provider value={panelContextMenuValue}>
      <SelectionPreviewContext.Provider value={previewSelectedPanelIds}>
        <div
          ref={layoutRef}
          // pointer-only selection gestures; keyboard users select through the panel context menu
          role="presentation"
          className={classNames({
            'dshLayout--editing': viewMode === 'edit',
            'dshLayout--selectMode': viewMode === 'edit' && isSelectMode,
            'dshLayout--selectionModifierHeld': viewMode === 'edit' && isSelectionModifierHeld,
            'dshLayout-withoutMargins': !useMargins,
            'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
          })}
          css={styles.dashboard}
          // capture phase, so area selection starts even if panel content stops mousedown
          onMouseDownCapture={handleGridMouseDown}
          onClick={handleGridClick}
          onClickCapture={handleGridClickCapture}
        >
          {memoizedGridLayout}
        </div>
        {selectionRect && viewMode === 'edit' && (
          <div
            role="presentation"
            style={{
              position: 'fixed',
              left: selectionRect.left,
              top: selectionRect.top,
              width: Math.max(1, selectionRect.width),
              height: Math.max(1, selectionRect.height),
              border: '1px solid #0B64DD',
              backgroundColor: 'rgba(11, 100, 221, 0.08)',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
            data-test-subj="dashboardSelectionOverlay"
          />
        )}
        {clickHint && viewMode === 'edit' && (
          // keyed by click, so each click restarts the hint
          <PanelClickHint
            key={clickHint.id}
            position={clickHint.position}
            onDismiss={dismissClickHint}
          />
        )}
        {contextMenu && viewMode === 'edit' && (
          <PanelContextMenu
            panelId={contextMenu.panelId}
            position={contextMenu.position}
            selectedPanelIds={selectedPanelIds}
            onClose={() => setContextMenu(null)}
          />
        )}
      </SelectionPreviewContext.Provider>
    </PanelContextMenuContext.Provider>
  );
};

const convertGridPanelToDashboardGridData = (panel: GridPanelData): GridData => {
  return {
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
      '.dshDashboardGrid__item--hideHoverActions .embPanel__hoverActions': {
        visibility: 'hidden !important' as 'hidden',
      },
      // Select mode: the hovered panel previews the selected outline
      '&.dshLayout--selectionModifierHeld': {
        '.embPanel__content, .embPanel__header': {
          pointerEvents: 'none',
        },
      },
      '&.dshLayout--selectMode .dshDashboardGrid__item:hover .embPanel': {
        outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongPrimary}`,
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
        paddingLeft: euiTheme.size.s,
        paddingRight: euiTheme.size.s,
        '.embPanel__content, .embPanel, .embPanel__hoverActionsAnchor, .lnsExpressionRenderer': {
          borderRadius: 0,
        },
        '.embPanel__content, .embPanel__header': {
          backgroundColor: euiTheme.colors.backgroundBasePlain,
        },
      },
      // drag handle visibility when dashboard is in edit mode or a panel is expanded
      '&.dshLayout-withoutMargins:not(.dshLayout--editing), .dshDashboardGrid__item--expanded, .dshDashboardGrid__item--blurred':
        {
          '.embPanel--dragHandle, ~.kbnGridPanel--resizeHandle': {
            visibility: 'hidden',
          },
        },
      // in select mode a click or drag on a panel selects, so panels can't be resized
      '.dshDashboardGrid__item--selectMode ~ .kbnGridPanel--resizeHandle': {
        visibility: 'hidden',
      },
    }),
};
