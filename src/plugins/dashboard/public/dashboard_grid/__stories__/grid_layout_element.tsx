/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPanel, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useRef } from 'react';
import { GridData } from './types';

export const KibanaGridElement = ({
  id,
  isBeingDragged,
  gridData,
  updateShift,
  setDraggingId,
  setResizingId,
}: {
  id: string;
  gridData: GridData;
  isBeingDragged: boolean;
  setDraggingId: (id: string | undefined) => void;
  setResizingId: (id: string | undefined) => void;
  updateShift: (pos: { x: number; y: number }) => void;
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={divRef}
      css={css`
        grid-column-start: ${gridData.column + 1};
        grid-column-end: ${gridData.column + 1 + gridData.width};
        grid-row-start: ${gridData.row + 1};
        grid-row-end: ${gridData.row + 1 + gridData.height};
      `}
    >
      <EuiPanel
        hasShadow={false}
        hasBorder={true}
        css={css`
          position: relative;
          height: 100%;
          border: ${isBeingDragged ? `1px dashed ${euiThemeVars.euiColorSuccess}` : 'auto'};
          :hover .resizeHandle {
            opacity: 1;
          }
        `}
      >
        <div
          draggable="true"
          css={css`
            top: 0;
            position: absolute;
            background-color: red;
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            cursor: move;
          `}
          onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.dropEffect = 'move';
            const shiftX = e.clientX - divRef.current!.getBoundingClientRect().left;
            const shiftY = e.clientY - divRef.current!.getBoundingClientRect().top;
            updateShift({ x: shiftX, y: shiftY });
            setDraggingId(id);
          }}
        ></div>
        <strong>id:</strong> {gridData.id}{' '}
        <div
          draggable="true"
          className="resizeHandle"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.dropEffect = 'move';
            const shiftX = e.clientX - divRef.current!.getBoundingClientRect().right;
            const shiftY = e.clientY - divRef.current!.getBoundingClientRect().bottom;
            updateShift({ x: shiftX, y: shiftY });
            setResizingId(id);
          }}
          css={css`
            right: 0;
            bottom: 0;
            opacity: 0;
            position: absolute;
            width: ${euiThemeVars.euiSizeL};
            height: ${euiThemeVars.euiSizeL};
            border-radius: 7px 0 7px 0;
            border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
            border-right: 2px solid ${euiThemeVars.euiColorSuccess};
            transition: opacity 0.2s, border 0.2s;
            margin: -2px;
            :hover {
              background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
              cursor: se-resize;
            }
          `}
        ></div>
      </EuiPanel>
    </div>
  );
};
