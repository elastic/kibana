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

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './grid_panel_resize_handle';
import { useGridPanelState } from './use_panel_grid_data';
import { ResizeGauge } from './grid_panel_resize_gauge';

export interface GridPanelProps {
  panelId: string;
}

export const GridPanel = React.memo(({ panelId }: GridPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();
  const panel$ = useGridPanelState({ panelId });
  const dragHandleApi = useDragHandleApi({ panelId });

  const initialStyles = useMemo(() => {
    const initialPanel = panel$.getValue();
    if (!initialPanel) return;
    return css`
      position: relative;
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
          // pin this panel at its rendered width so no panel can grow/shrink and shift the resized one
          const ref = gridLayoutStateManager.panelRefs.current[panelId];
          const pinnedWidth = after.panelWidths?.[panelId];
          if (!ref || pinnedWidth === undefined) return;
          ref.style.width = `${pinnedWidth}px`;
          ref.style.flexGrow = '0';
          ref.style.flexShrink = '0';
        }),
        filter(([before]) => before !== undefined),
        map(([, after]) => after),
        startWith(undefined)
      ),
      panel$,
    ])
      .pipe(skip(1))
      .subscribe(([activePanel, currentPanel]) => {
        if (!currentPanel) return;
        const ref = gridLayoutStateManager.panelRefs.current[currentPanel?.id];
        const isPanelActive = activePanel && activePanel.id === currentPanel?.id;
        if (!ref) return;

        if (isPanelActive) {
          // allow click events through before triggering active status
          ref.classList.add('kbnFlexPanel--active');

          // if the current panel is active, give it fixed positioning depending on the interaction event
          const { position: draggingPosition } = activePanel;

          ref.style.zIndex = `${euiTheme.levels.modal}`;
          if (activePanel.type === 'resize') {
            // if the current panel is being resized, ensure it is not shrunk past the size of a single cell
            ref.style.flexGrow = '0';
            ref.style.flexShrink = '0';
            ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
          } else {
            // if the current panel is being dragged, render it with a fixed position + size
            ref.style.position = 'fixed';

            ref.style.left = `${draggingPosition.left}px`;
            ref.style.top = `${draggingPosition.top}px`;
            ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
            ref.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;
          }
        } else {
          // siblings stay pinned (see above) until the resize ends
          if (activePanel?.type === 'resize') return;

          ref.style.flexShrink = '';
          ref.classList.remove('kbnFlexPanel--active');
          ref.style.zIndex = `auto`;
          // if the panel is not being dragged and/or resized, undo any fixed position styles
          ref.style.position = '';
          ref.style.left = ``;
          ref.style.top = ``;
          ref.style.flexGrow = currentPanel.grow ? '1' : '0';
          ref.style.width = `${currentPanel.width}px`;
          ref.style.order = `${currentPanel.order + 1}`;
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
      css={[initialStyles, styles.panel]}
      className="kbnFlexPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} />
      <ResizeGauge panelId={panelId} />
    </div>
  );
});

GridPanel.displayName = 'kbnFlexLayoutPanel';

const styles = {
  panel: css({
    height: 'calc(var(--kbnFlexRowHeight) * 1px)',
  }),
};
