/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiIcon,
  EuiLoadingChart,
  EuiScreenReaderOnly,
  euiCanAnimate,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { apiCanCancelRequests, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import { printViewportVisStyles } from '../print_styles';
import { DASHBOARD_MARGIN_SIZE, SELECTION_DRAG_THRESHOLD_PX } from './constants';
import { getHighlightStyles } from './highlight_styles';
import { PanelContextMenuContext, SelectionPreviewContext } from './panel_context_menu';
import { SelectedPanelActions } from './selected_panel_actions';
import { isSelectionModifierPressed } from './selection_modifier';

const selectedLabel = i18n.translate('dashboard.panel.selectedLabel', {
  defaultMessage: 'Selected',
});

type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export interface Props extends DivProps {
  appFixedViewport?: HTMLElement;
  id: string;
  index?: number;
  type: string;
  key: string;
  isRenderable?: boolean;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const DashboardGridItem = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      appFixedViewport,
      id,
      index,
      type,
      isRenderable = true,
      setDragHandles,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const dashboardApi = useDashboardApi();
    const dashboardInternalApi = useDashboardInternalApi();
    const embeddableApiRef = useRef<DefaultEmbeddableApi | null>(null);
    const [
      hidePanelBorders,
      highlightPanelId,
      scrollToPanelId,
      expandedPanelId,
      focusedPanelId,
      selectedPanelIds,
      useMargins,
      viewMode,
      dashboardContainerRef,
      relatedPanelsIndicatorId,
      blurredPanelIds,
      isSelectMode,
    ] = useBatchedPublishingSubjects(
      dashboardApi.hideBorder$,
      dashboardApi.highlightPanelId$,
      dashboardApi.scrollToPanelId$,
      dashboardApi.expandedPanelId$,
      dashboardApi.focusedPanelId$,
      dashboardApi.selectedPanelIds$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode$,
      dashboardInternalApi.dashboardContainerRef$,
      dashboardApi.relatedPanelsIndicatorId$,
      dashboardApi.blurredPanelIds$,
      dashboardApi.isSelectMode$
    );

    const expandPanel = expandedPanelId !== undefined && expandedPanelId === id;
    const hidePanel = expandedPanelId !== undefined && expandedPanelId !== id;

    const isIndicatingRelatedPanels =
      relatedPanelsIndicatorId !== undefined && relatedPanelsIndicatorId === id;

    const focusPanel =
      isIndicatingRelatedPanels || (focusedPanelId !== undefined && focusedPanelId === id);
    const focusedForEdit = focusedPanelId !== undefined && focusedPanelId === id;

    const blurPanel = blurredPanelIds.includes(id);

    const showBorder = useMargins && !hidePanelBorders; // we do not show panel borders when margins are disabled
    const previewSelectedPanelIds = useContext(SelectionPreviewContext);
    const isSelected = selectedPanelIds.has(id) || (previewSelectedPanelIds?.has(id) ?? false);
    const showSelectedPanelActions = viewMode === 'edit' && selectedPanelIds.has(id);
    const isInSelectMode =
      viewMode === 'edit' && (isSelectMode || (previewSelectedPanelIds?.size ?? 0) > 0);
    const classes = classNames('dshDashboardGrid__item', {
      'dshDashboardGrid__item--expanded': expandPanel,
      'dshDashboardGrid__item--hidden': hidePanel,
      'dshDashboardGrid__item--focused': focusPanel,
      'dshDashboardGrid__item--blurred': blurPanel,
      'dshDashboardGrid__item--selected': isSelected,
      'dshDashboardGrid__item--selectMode': isInSelectMode,
      'dshDashboardGrid__item--indicatingRelatedPanels': isIndicatingRelatedPanels,
      // in select mode a click selects, so the drag handle and panel actions would compete with it
      'dshDashboardGrid__item--hideHoverActions': blurPanel || focusedForEdit || isInSelectMode,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      printViewport__vis: viewMode === 'print',
    });

    useLayoutEffect(() => {
      if (typeof ref !== 'function' && ref?.current) {
        const panelRef = ref.current;
        if (scrollToPanelId === id) {
          dashboardApi.scrollToPanel(panelRef);
        }
        if (highlightPanelId === id) {
          dashboardApi.highlightPanel(panelRef);
        }

        panelRef.querySelectorAll('*').forEach((e) => {
          if (blurPanel) {
            // remove blurred panels and nested elements from tab order
            e.setAttribute('tabindex', '-1');
          } else {
            // restore tab order
            e.removeAttribute('tabindex');
          }
        });
      }
    }, [id, dashboardApi, scrollToPanelId, highlightPanelId, ref, blurPanel]);

    // In select mode the panel's content is out of reach for the keyboard too, so Tab moves between
    // panels instead of into charts. The header stays reachable for inline title editing.
    useEffect(() => {
      if (!isInSelectMode || typeof ref === 'function' || !ref?.current) return;
      const regions = Array.from(ref.current.querySelectorAll<HTMLElement>('.embPanel__content'));
      regions.forEach((region) => region.setAttribute('inert', ''));
      return () => regions.forEach((region) => region.removeAttribute('inert'));
    }, [isInSelectMode, isRenderable, ref]);

    useEffect(() => {
      return () => {
        if (embeddableApiRef.current && apiCanCancelRequests(embeddableApiRef.current)) {
          embeddableApiRef.current.cancelRequests();
        }
      };
    }, []);

    const dashboardContainerTopOffset = dashboardContainerRef?.offsetTop || 0;
    const globalNavTopOffset = appFixedViewport?.offsetTop || 0;
    const styles = useMemoCss(dashboardGridItemStyles);

    const renderedEmbeddable = useMemo(() => {
      const panelProps = {
        isSharedItem: true,
        showBadges: true,
        showBorder,
        showShadow: false,
        setDragHandles,
      };

      return (
        <EmbeddableRenderer
          type={type}
          maybeId={id}
          getParentApi={() => dashboardApi}
          key={`${type}_${id}`}
          panelProps={panelProps}
          onApiAvailable={(api) => {
            embeddableApiRef.current = api;
            dashboardApi.registerChildApi(api);
          }}
        />
      );
    }, [id, dashboardApi, type, showBorder, setDragHandles]);

    const { euiTheme } = useEuiTheme();
    const hoverActionsHeight = euiTheme.base * 2;

    const focusStyles = blurPanel
      ? styles.focusPanelBlur
      : css({
          scrollMarginTop: `${
            dashboardContainerTopOffset +
            globalNavTopOffset +
            DASHBOARD_MARGIN_SIZE +
            hoverActionsHeight
          }px`,
        });

    const panelContextMenu = useContext(PanelContextMenuContext);

    // In edit mode Cmd+click / Cmd+drag (Ctrl outside macOS) belong to the dashboard's panel
    // selection. They are handled in the capture phase so panel content (e.g. Lens Metric, which
    // stops click propagation, or maps and charts with their own modifier gestures) never receives them.
    const isSelectionGesture = useCallback(
      (e: React.MouseEvent) =>
        viewMode === 'edit' &&
        isSelectionModifierPressed(e) &&
        !(e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]'),
      [viewMode]
    );

    const mouseDownPositionRef = useRef<{ x: number; y: number } | null>(null);

    // In select mode (entered by selecting a panel) a plain click anywhere on a panel, header
    // included, toggles it. The panel's own actions keep working, and clicks from portaled content
    // (e.g. hover action popovers) or that end a panel drag are ignored.
    const isSelectModeClick = useCallback(
      (e: React.MouseEvent) => {
        if (viewMode !== 'edit' || !isSelectMode) return false;
        const target = e.target as HTMLElement;
        if (!(e.currentTarget as HTMLElement).contains(target)) return false;
        if (
          target.closest(
            'input, textarea, [contenteditable="true"], .embPanel__hoverActions, .embPanel__titleInlineEdit, [data-test-subj^="dashboardSelectedPanelActions"]'
          )
        ) {
          return false;
        }
        const start = mouseDownPositionRef.current;
        return (
          !start ||
          (Math.abs(e.clientX - start.x) < SELECTION_DRAG_THRESHOLD_PX &&
            Math.abs(e.clientY - start.y) < SELECTION_DRAG_THRESHOLD_PX)
        );
      },
      [viewMode, isSelectMode]
    );

    const handlePanelMouseDownCapture = useCallback(
      (e: React.MouseEvent) => {
        mouseDownPositionRef.current = { x: e.clientX, y: e.clientY };
        if (isSelectionGesture(e)) e.stopPropagation();
      },
      [isSelectionGesture]
    );

    const handlePanelClickCapture = useCallback(
      (e: React.MouseEvent) => {
        if (!isSelectionGesture(e) && !isSelectModeClick(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dashboardApi.togglePanelSelection(id);
      },
      [isSelectionGesture, isSelectModeClick, dashboardApi, id]
    );

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        // the bulk actions menu is only for selected panels; otherwise keep the browser's menu
        if (viewMode === 'edit' && panelContextMenu && selectedPanelIds.has(id)) {
          e.preventDefault();
          e.stopPropagation();
          panelContextMenu.openContextMenu(id, { x: e.clientX, y: e.clientY });
        }
      },
      [viewMode, panelContextMenu, selectedPanelIds, id]
    );

    return (
      <div
        css={[focusStyles, styles.item]}
        className={[classes, className].join(' ')}
        data-test-subj="dashboardPanel"
        id={`panel-${id}`}
        ref={ref}
        onMouseDownCapture={handlePanelMouseDownCapture}
        onClickCapture={handlePanelClickCapture}
        onContextMenu={handleContextMenu}
        {...rest}
      >
        {isRenderable ? (
          <>
            {renderedEmbeddable}
            {viewMode === 'edit' && !isInSelectMode && (
              // Panels without a title have no header to click, so this strip along their top edge
              // gives the Cmd+click hint a place to show up. It's only visible when the panel has
              // no header.
              <div
                className="dshDashboardGrid__hintArea"
                css={styles.hintArea}
                aria-hidden={true}
                data-test-subj={`dashboardPanelHintArea-${id}`}
              />
            )}
            {isInSelectMode && (
              <span
                className={classNames('dshDashboardGrid__selectionIndicator', {
                  'dshDashboardGrid__selectionIndicator--checked': isSelected,
                })}
                css={styles.selectionIndicator}
                data-test-subj={`dashboardPanelSelectionIndicator-${id}`}
              >
                {isSelected && (
                  <>
                    <EuiIcon
                      type="check"
                      color="ghost"
                      size="s"
                      css={styles.selectionCheck}
                      aria-hidden={true}
                    />
                    <EuiScreenReaderOnly>
                      <span>{selectedLabel}</span>
                    </EuiScreenReaderOnly>
                  </>
                )}
              </span>
            )}
            {showSelectedPanelActions && (
              <SelectedPanelActions panelId={id} selectedPanelIds={selectedPanelIds} />
            )}
            {children}
          </>
        ) : (
          <div>
            <EuiLoadingChart size="l" />
          </div>
        )}
      </div>
    );
  }
);

const dashboardGridItemStyles = {
  item: (context: UseEuiTheme) =>
    css([
      {
        height: '100%',
        // Remove padding in fullscreen mode
        '.kbnAppWrapper--hiddenChrome &.dshDashboardGrid__item--expanded': {
          padding: 0,
        },
        '.kbnAppWrapper--hiddenChrome & .dshDashboardGrid__item--expanded': {
          padding: 0,
        },
        // anchors the hint strip of untitled panels to the panel's top edge
        '&:has(> .dshDashboardGrid__hintArea)': {
          position: 'relative',
        },
        // anchors the selection indicator and the selected panel actions to the panel's edges
        '&.dshDashboardGrid__item--selectMode': {
          position: 'relative',
          // in select mode a click anywhere on a panel selects it, so its content (chart tooltips,
          // brushing, ...) stops reacting to the pointer and clicks land on the panel. Inline title
          // editing is the one exception.
          '.embPanel__content, .embPanel__header': {
            pointerEvents: 'none',
          },
          '.embPanel__header .embPanel__titleInlineEdit': {
            pointerEvents: 'auto',
          },
        },
        '&:hover .dshDashboardGrid__selectionIndicator:not(.dshDashboardGrid__selectionIndicator--checked)':
          {
            borderColor: context.euiTheme.colors.borderStrongPrimary,
          },
        // Call out focused panels with a simple border
        '&.dshDashboardGrid__item--focused .embPanel': {
          outline: `${context.euiTheme.border.width.thick} solid ${context.euiTheme.colors.vis.euiColorVis0}`,
        },
        // Call out panels that are indicating their related panels with the same border plus a semitransparent overlay
        '&.dshDashboardGrid__item--indicatingRelatedPanels': {
          position: 'relative',
          // Ensure the overall panel still has a plain background so we can apply the semitransparent overlay on top of it
          backgroundColor: context.euiTheme.colors.backgroundBasePlain,
          '& .embPanel': {
            backgroundColor: transparentize(context.euiTheme.colors.vis.euiColorVis0, 0.1),

            '& div, & button': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
      getHighlightStyles(context),
      printViewportVisStyles(context),
    ]),
  hintArea: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'none',
      // only for panels without a header; a titled panel's header row already shows the hint
      '.dshDashboardGrid__item:not(:has(.embPanel__header)) > &': {
        display: 'block',
      },
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: euiTheme.size.s,
      zIndex: 1,
      borderTopLeftRadius: euiTheme.border.radius.medium,
      borderTopRightRadius: euiTheme.border.radius.medium,
      // same feedback as hovering a panel's title row
      '&:hover': {
        backgroundColor: transparentize(euiTheme.colors.backgroundBasePrimary, 0.5),
      },
    }),
  // Inset in the top-right corner; the selected panel actions sit on the top edge to its left
  selectionIndicator: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: euiTheme.size.s,
      right: euiTheme.size.s,
      zIndex: euiTheme.levels.menu,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      // checkbox-sized, so it reads as selectable without competing with the panel content
      width: `calc(${euiTheme.size.base} + ${euiTheme.size.xxs})`,
      height: `calc(${euiTheme.size.base} + ${euiTheme.size.xxs})`,
      borderRadius: '50%',
      border: `1.5px solid ${euiTheme.colors.borderBaseProminent}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      pointerEvents: 'none',
      [euiCanAnimate]: {
        transition: `border-color ${euiTheme.animation.fast} ease-out, background-color ${euiTheme.animation.fast} ease-out`,
      },
      '&.dshDashboardGrid__selectionIndicator--checked': {
        borderColor: euiTheme.colors.backgroundFilledPrimary,
        backgroundColor: euiTheme.colors.backgroundFilledPrimary,
      },
    }),
  selectionCheck: ({ euiTheme }: UseEuiTheme) => {
    const checkIn = keyframes({
      from: { transform: 'scale(0.6)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    });
    return css({
      [euiCanAnimate]: {
        animation: `${checkIn} ${euiTheme.animation.fast} ease-out`,
      },
    });
  },
  focusPanelBlur: css({
    pointerEvents: 'none',
    opacity: '0.25',
  }),
};
