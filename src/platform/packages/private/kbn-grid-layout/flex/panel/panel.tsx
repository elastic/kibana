/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { combineLatest, filter, map, pairwise, skip, startWith, tap } from 'rxjs';

import { euiBreakpoint, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from '../../common/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './panel_resize_handle';
import { usePanelState } from './use_panel_state';
import { ResizeGauge } from './panel_resize_gauge';
import { applyActivePanelStyles, clearActivePanelStyles, pinPanelWidth } from './panel_styles';

export interface PanelProps {
  panelId: string;
}

export const Panel = React.memo(({ panelId }: PanelProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();
  const panel$ = usePanelState({ panelId });
  const dragHandleApi = useDragHandleApi({ panelId });

  const initialStyles = useMemo(() => {
    const initialPanel = panel$.getValue();
    if (!initialPanel) return;
    return css`
      width: ${initialPanel.width}px;
      order: ${initialPanel.order + 1};
      flex-grow: ${initialPanel.grow ? '1' : '0'};
      .kbnFlexPanel--dragHandle,
      .kbnFlexPanel--resizeHandle {
        touch-action: none; // prevent scrolling on touch devices
        scroll-margin-top: ${gridLayoutStateManager.gridSettings$.value.keyboardDragTopLimit}px;
      }
    `;
  }, [panel$, gridLayoutStateManager.gridSettings$]);

  const panelStyles = useMemo(() => styles.panel(euiThemeContext), [euiThemeContext]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.panelRefs.current[panelId];
    };
  }, [panelId, gridLayoutStateManager]);

  useEffect(() => {
    /** Update the styles of the panel as it is dragged via a subscription to prevent re-renders */
    const activePanelStyleSubscription = combineLatest([
      gridLayoutStateManager.activePanelEvent$.pipe(
        // filter out the first active panel event to allow "onClick" events through
        pairwise(),
        tap(([before, after]) => {
          if (before !== undefined || after?.type !== 'resize') return;
          const ref = gridLayoutStateManager.panelRefs.current[panelId];
          const pinnedWidth = after.panelWidths?.[panelId];
          if (ref && pinnedWidth !== undefined) pinPanelWidth(ref, pinnedWidth);
        }),
        filter(([before]) => before !== undefined),
        map(([, after]) => after),
        startWith(undefined)
      ),
      panel$,
    ])
      .pipe(skip(1))
      .subscribe(([activePanel, panel]) => {
        const ref = panel && gridLayoutStateManager.panelRefs.current[panel.id];
        if (!panel || !ref) return;
        if (activePanel?.id === panel.id) {
          applyActivePanelStyles({ ref, activePanel, panel, zIndex: euiTheme.levels.modal });
        } else if (activePanel?.type !== 'resize') {
          // siblings stay pinned (see tap above) until the resize ends
          clearActivePanelStyles(ref, panel);
        }
      });

    return () => {
      activePanelStyleSubscription.unsubscribe();
    };
  }, [panelId, panel$, gridLayoutStateManager, euiTheme.levels.modal]);

  /**
   * Memoize panel contents to prevent unnecessary re-renders
   */
  const panelContents = useMemo(() => {
    return renderPanelContents(panelId, dragHandleApi.setDragHandles);
  }, [panelId, renderPanelContents, dragHandleApi]);

  return (
    <div
      ref={(element) => {
        gridLayoutStateManager.panelRefs.current[panelId] = element;
      }}
      role="listitem"
      css={[initialStyles, panelStyles]}
      className="kbnFlexPanel"
    >
      {!useCustomDragHandle && (
        <DefaultDragHandle dragHandleApi={dragHandleApi} layoutPrefix="kbnFlex" />
      )}
      {panelContents}
      <ResizeHandle panelId={panelId} />
      <ResizeGauge panelId={panelId} />
    </div>
  );
});

Panel.displayName = 'kbnFlexLayoutPanel';

const styles = {
  panel: (euiThemeContext: UseEuiTheme) =>
    css({
      position: 'relative',
      maxWidth: '100%',
      height: 'calc(var(--kbnFlexRowHeight) * 1px)',
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        // flex-basis wins over the inline width set while dragging/resizing, so panels stack full-width
        flex: '1 0 100%',
      },
    }),
};
