/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPortal, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React from 'react';
import { GridRow } from './grid_row';
import { GridLayoutData, GridSettings } from './types';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';

export const GridLayout = ({
  getCreationOptions,
  renderPanelContents,
}: {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
  renderPanelContents: (panelId: string) => React.ReactNode;
}) => {
  const { gridLayoutStateManager, gridSizeRef } = useGridLayoutState({
    getCreationOptions,
  });
  useGridLayoutEvents({ gridLayoutStateManager });

  const [gridLayout, runtimeSettings, interactionEvent] = useBatchedPublishingSubjects(
    gridLayoutStateManager.gridLayout$,
    gridLayoutStateManager.runtimeSettings$,
    gridLayoutStateManager.interactionEvent$
  );

  return (
    <div ref={gridSizeRef}>
      {gridLayout.map((rowData, rowIndex) => {
        return (
          <GridRow
            rowData={rowData}
            key={rowData.title}
            rowIndex={rowIndex}
            runtimeSettings={runtimeSettings}
            activePanelId={interactionEvent?.id}
            renderPanelContents={renderPanelContents}
            targetRowIndex={interactionEvent?.targetRowIndex}
            toggleIsCollapsed={() => {
              const currentLayout = gridLayoutStateManager.gridLayout$.value;
              currentLayout[rowIndex].isCollapsed = !currentLayout[rowIndex].isCollapsed;
              gridLayoutStateManager.gridLayout$.next(currentLayout);
            }}
            setInteractionEvent={(nextInteractionEvent) => {
              if (!nextInteractionEvent) {
                gridLayoutStateManager.hideDragPreview();
              }
              gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
            }}
            ref={(element) => (gridLayoutStateManager.rowRefs.current[rowIndex] = element)}
          />
        );
      })}
      <EuiPortal>
        <div
          css={css`
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            position: fixed;
            overflow: hidden;
            pointer-events: none;
            z-index: ${euiThemeVars.euiZModal};
          `}
        >
          <div
            ref={gridLayoutStateManager.dragPreviewRef}
            css={css`
              pointer-events: none;
              z-index: ${euiThemeVars.euiZModal};
              border-radius: ${euiThemeVars.euiBorderRadius};
              background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
              transition: opacity 100ms linear;
              position: absolute;
            `}
          />
        </div>
      </EuiPortal>
    </div>
  );
};
