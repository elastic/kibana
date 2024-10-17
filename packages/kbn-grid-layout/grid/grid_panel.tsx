/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiIcon,
  EuiPanel,
  euiFullHeight,
  transparentize,
  useEuiOverflowScroll,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { forwardRef } from 'react';
import { GridPanelData, PanelInteractionEvent } from './types';

export const GridPanel = forwardRef<
  HTMLDivElement,
  {
    panelData: GridPanelData;
    activePanelId: string | undefined;
    renderPanelContents: (panelId: string) => React.ReactNode;
    interactionStart: (
      type: PanelInteractionEvent['type'],
      e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => void;
  }
>(({ activePanelId, panelData, renderPanelContents, interactionStart }, panelRef) => {
  const thisPanelActive = activePanelId === panelData.id;

  return (
    <div ref={panelRef}>
      <EuiPanel
        hasShadow={false}
        hasBorder={true}
        css={css`
          padding: 0;
          position: relative;
          height: 100%;
          border: ${thisPanelActive
            ? `${euiThemeVars.euiBorderWidthThin} dashed ${euiThemeVars.euiColorSuccess}`
            : 'auto'};
          :hover .resizeHandle {
            opacity: ${Boolean(activePanelId) ? 0 : 1};
          }
          :hover .dragHandle {
            opacity: ${Boolean(activePanelId) ? 0 : 1};
          }
        `}
      >
        {/* drag handle */}
        <div
          className="dragHandle"
          css={css`
            opacity: 0;
            &:active,
            &:hover {
              opacity: 1 !important;
            }
            display: flex;
            cursor: move;
            position: absolute;
            align-items: center;
            justify-content: center;
            top: -${euiThemeVars.euiSizeL};
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            z-index: ${euiThemeVars.euiZLevel3};
            margin-left: ${euiThemeVars.euiSizeS};
            border: 1px solid ${euiThemeVars.euiBorderColor};
            background-color: ${euiThemeVars.euiColorEmptyShade};
            border-radius: ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0 0;
            &:hover {
              cursor: grab;
            }
          `}
          onMouseDown={(e) => interactionStart('drag', e)}
          onMouseUp={(e) => interactionStart('drop', e)}
        >
          <EuiIcon type="grabOmnidirectional" />
        </div>
        {/* Resize handle */}
        <div
          className="resizeHandle"
          onMouseDown={(e) => interactionStart('resize', e)}
          onMouseUp={(e) => interactionStart('drop', e)}
          css={css`
            right: 0;
            bottom: 0;
            opacity: 0;
            margin: -2px;
            position: absolute;
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            transition: opacity 0.2s, border 0.2s;
            border-radius: 7px 0 7px 0;
            border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
            border-right: 2px solid ${euiThemeVars.euiColorSuccess};
            :hover {
              background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
              cursor: se-resize;
            }
          `}
        />
        <div
          css={css`
            ${euiFullHeight()}
            ${useEuiOverflowScroll('y', false)}
            ${useEuiOverflowScroll('x', false)}
          `}
        >
          {renderPanelContents(panelData.id)}
        </div>
      </EuiPanel>
    </div>
  );
});
