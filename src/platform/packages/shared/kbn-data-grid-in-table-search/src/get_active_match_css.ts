/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, type SerializedStyles } from '@emotion/react';
import { CELL_MATCH_INDEX_ATTRIBUTE, HIGHLIGHT_CLASS_NAME } from './constants';
import type { ActiveMatch } from './types';
import { getHighlightColors } from './get_highlight_colors';

export interface GetActiveMatchCssProps {
  activeMatch: ActiveMatch;
  colors: ReturnType<typeof getHighlightColors>;
}

export const getActiveMatchCss = ({
  activeMatch,
  colors,
}: GetActiveMatchCssProps): SerializedStyles => {
  const { rowIndex, columnId, matchIndexWithinCell } = activeMatch;

  // Defines highlight styles for the active match.
  // The cell border is useful when the active match is not visible due to the limited cell boundaries.
  return css`
    .euiDataGridRowCell[data-gridcell-row-index='${rowIndex}'][data-gridcell-column-id='${columnId}'] {
      &:after {
        content: '';
        z-index: 2;
        pointer-events: none;
        position: absolute;
        inset: 0;
        border: 2px solid ${colors.activeHighlightBorderColor} !important;
        border-radius: 3px;
      }
      .${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='${matchIndexWithinCell}'] {
        color: ${colors.activeHighlightColor} !important;
        background-color: ${colors.activeHighlightBackgroundColor} !important;
      }
    }
  `;
};
