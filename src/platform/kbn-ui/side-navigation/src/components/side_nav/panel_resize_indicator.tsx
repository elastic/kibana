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
}

const getContainerStyles = (euiThemeContext: UseEuiTheme) => css`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: ${euiThemeContext.euiTheme.levels.header};
`;

const getStretchBandStyles = (euiThemeContext: UseEuiTheme) => css`
  position: absolute;
  top: 0;
  height: 100%;
  background-color: ${transparentize(euiThemeContext.euiTheme.colors.primary, 0.1)};
  transition: width ${euiThemeContext.euiTheme.animation.fast} ease,
    left ${euiThemeContext.euiTheme.animation.fast} ease;
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
}) => {
  const euiThemeContext = useEuiTheme();
  const baseHalfWidth = SIDE_PANEL_INDICATOR_BASE_WIDTH / 2;
  const bandWidth = SIDE_PANEL_INDICATOR_BASE_WIDTH + stretchLeft + stretchRight;
  const bandLeft = primaryX - baseHalfWidth - stretchLeft;
  const isStretching = stretchLeft > 0 || stretchRight > 0;

  return (
    <EuiPortal>
      <div css={getContainerStyles(euiThemeContext)}>
        <div css={{ top, height, position: 'absolute', left: 0, right: 0 }}>
          <div
            css={[
              getStretchBandStyles(euiThemeContext),
              !isStretching &&
                css`
                  transition: none;
                `,
            ]}
            style={{ left: bandLeft, width: bandWidth }}
          />
          <div css={getPrimaryLineStyles(euiThemeContext)} style={{ left: primaryX }} />
        </div>
      </div>
    </EuiPortal>
  );
};
