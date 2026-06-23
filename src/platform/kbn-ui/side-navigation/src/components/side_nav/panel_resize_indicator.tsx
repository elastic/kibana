/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { EuiPortal, transparentize, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import {
  SIDE_PANEL_INDICATOR_BASE_WIDTH,
  type SidePanelDragIndicatorState,
} from '../../utils/side_panel_width_utils';

export interface SidePanelResizeIndicatorProps extends SidePanelDragIndicatorState {
  top: number;
  height: number;
  pointerY: number;
}

interface StretchBandPathParams {
  height: number;
  primaryX: number;
  stretchLeft: number;
  stretchRight: number;
  pointerY: number;
  baseHalfWidth: number;
}

export const buildStretchBandPath = ({
  height,
  primaryX,
  stretchLeft,
  stretchRight,
  pointerY,
  baseHalfWidth,
}: StretchBandPathParams): string => {
  const left = primaryX - baseHalfWidth;
  const right = primaryX + baseHalfWidth;
  const clampedPointerY = Math.max(0, Math.min(height, pointerY));

  if (stretchLeft > 0) {
    return [
      `M ${right} 0`,
      `L ${right} ${height}`,
      `L ${left} ${height}`,
      `Q ${left - stretchLeft} ${clampedPointerY} ${left} 0`,
      'Z',
    ].join(' ');
  }

  if (stretchRight > 0) {
    return [
      `M ${left} 0`,
      `L ${left} ${height}`,
      `L ${right} ${height}`,
      `Q ${right + stretchRight} ${clampedPointerY} ${right} 0`,
      'Z',
    ].join(' ');
  }

  return [`M ${left} 0`, `L ${right} 0`, `L ${right} ${height}`, `L ${left} ${height}`, 'Z'].join(
    ' '
  );
};

const getContainerStyles = (euiThemeContext: UseEuiTheme) => css`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: ${euiThemeContext.euiTheme.levels.header};
`;

const getStretchSvgStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
`;

const getStretchTransitionStyles = (euiThemeContext: UseEuiTheme) => css`
  path {
    transition: d ${euiThemeContext.euiTheme.animation.fast} ease;
  }
`;

const getPrimaryLineStyles = (euiThemeContext: UseEuiTheme) => css`
  position: absolute;
  top: 0;
  height: 100%;
  width: ${euiThemeContext.euiTheme.border.width.thin};
  background-color: ${euiThemeContext.euiTheme.colors.primary};
  transform: translateX(-50%);
`;

export const SidePanelResizeIndicator: FC<SidePanelResizeIndicatorProps> = ({
  top,
  height,
  primaryX,
  stretchLeft,
  stretchRight,
  pointerY,
}) => {
  const euiThemeContext = useEuiTheme();
  const baseHalfWidth = SIDE_PANEL_INDICATOR_BASE_WIDTH / 2;
  const isStretching = stretchLeft > 0 || stretchRight > 0;
  const fillColor = transparentize(euiThemeContext.euiTheme.colors.primary, 0.1);
  const bandPath = buildStretchBandPath({
    height,
    primaryX,
    stretchLeft,
    stretchRight,
    pointerY,
    baseHalfWidth,
  });

  return (
    <EuiPortal>
      <div css={getContainerStyles(euiThemeContext)}>
        <div css={{ top, height, position: 'absolute', left: 0, right: 0 }}>
          <svg
            aria-hidden
            css={[
              getStretchSvgStyles,
              isStretching && getStretchTransitionStyles(euiThemeContext),
            ]}
            height={height}
            width="100%"
          >
            <path d={bandPath} fill={fillColor} />
          </svg>
          <div css={getPrimaryLineStyles(euiThemeContext)} style={{ left: primaryX }} />
        </div>
      </div>
    </EuiPortal>
  );
};
