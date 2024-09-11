/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import React, { useCallback, useRef } from 'react';
import { GridPanelData, PanelInteractionEvent } from './types';

export const GridPanel = ({
  activePanelId,
  panelData,
  renderPanelContents,
  setInteractionEvent,
}: {
  panelData: GridPanelData;
  activePanelId: string | undefined;
  renderPanelContents: (panelId: string) => React.ReactNode;
  setInteractionEvent: (interactionData?: Omit<PanelInteractionEvent, 'targetRowIndex'>) => void;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const thisPanelActive = activePanelId === panelData.id;

  const interactionStart = useCallback(
    (type: 'drag' | 'resize', e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!panelRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const panelRect = panelRef.current.getBoundingClientRect();
      setInteractionEvent({
        type,
        id: panelData.id,
        panelDiv: panelRef.current,
        mouseOffsets: {
          top: e.clientY - panelRect.top,
          left: e.clientX - panelRect.left,
          right: e.clientX - panelRect.right,
          bottom: e.clientY - panelRect.bottom,
        },
      });
    },
    [panelData.id, setInteractionEvent]
  );

  return (
    <div
      ref={panelRef}
      css={css`
        grid-column-start: ${panelData.column + 1};
        grid-column-end: ${panelData.column + 1 + panelData.width};
        grid-row-start: ${panelData.row + 1};
        grid-row-end: ${panelData.row + 1 + panelData.height};
      `}
    >
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
          `}
          onMouseDown={(e) => interactionStart('drag', e)}
        >
          <EuiIcon type="grabOmnidirectional" />
        </div>
        {/* Resize handle */}
        <div
          className="resizeHandle"
          onMouseDown={(e) => interactionStart('resize', e)}
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
};
