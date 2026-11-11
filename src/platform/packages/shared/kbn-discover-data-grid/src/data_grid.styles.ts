/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize, mathWithUnits } from '@elastic/eui';

export const DEFAULT_DATA_GRID_ROW_HEIGHT = 34;

export const getDataGridStyles = (themeContext: UseEuiTheme) => {
  const { euiTheme } = themeContext;
  const { fontSize, lineHeight } = euiFontSize(themeContext, 'xs');
  const cellPadding = mathWithUnits(euiTheme.size.m, (size) => size / 2);
  const cellOutlineBorderRadius = mathWithUnits(euiTheme.border.radius.inline, (size) => size / 2);

  return {
    grid: css({
      position: 'relative',
      overflow: 'auto',
      overflowAnchor: 'none',
      minBlockSize: 0,
      color: euiTheme.colors.textParagraph,
      backgroundColor: euiTheme.components.dataGridRowBackground,
      fontFamily: euiTheme.font.family,
      fontSize,
      lineHeight,
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
    }),
    headerRowGroup: css({
      position: 'sticky',
      insetBlockStart: 0,
      zIndex: 1,
    }),
    headerRow: css({
      display: 'grid',
      backgroundColor: euiTheme.colors.emptyShade,
      borderBlockEnd: euiTheme.border.thin,
    }),
    headerCell: css({
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      minInlineSize: 0,
      minBlockSize: euiTheme.size.xl,
      padding: cellPadding,
      overflow: 'hidden',
      fontWeight: euiTheme.font.weight.bold,
      userSelect: 'none',
    }),
    headerContent: css({
      flex: '1 1 auto',
      minInlineSize: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    virtualCanvas: css({
      position: 'relative',
      inlineSize: '100%',
    }),
    row: css({
      position: 'absolute',
      insetInlineStart: 0,
      display: 'grid',
      boxSizing: 'border-box',
      inlineSize: '100%',
      minBlockSize: DEFAULT_DATA_GRID_ROW_HEIGHT,
      backgroundColor: euiTheme.components.dataGridRowBackground,
      borderBlockEnd: `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`,
      '&[data-striped="true"]': {
        backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
      },
      '&:hover': {
        backgroundColor: euiTheme.components.dataGridRowBackground,
        backgroundImage: `linear-gradient(${euiTheme.components.dataGridRowBackgroundHover}, ${euiTheme.components.dataGridRowBackgroundHover})`,
      },
      '&[data-striped="true"]:hover': {
        backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStripedHover,
        backgroundImage: 'none',
      },
    }),
    cell: css({
      position: 'relative',
      boxSizing: 'border-box',
      minInlineSize: 0,
      padding: cellPadding,
      overflowWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      outline: 'none',
      '&:focus::after': {
        content: '""',
        position: 'absolute',
        zIndex: 3,
        pointerEvents: 'none',
        inset: 0,
        border: `${euiTheme.border.width.thick} solid ${euiTheme.components.dataGridRowBorderActive}`,
        borderRadius: cellOutlineBorderRadius,
      },
      '&:hover:not(:focus)::after': {
        content: '""',
        position: 'absolute',
        zIndex: 2,
        pointerEvents: 'none',
        inset: 0,
        border: `${euiTheme.border.width.thick} solid ${euiTheme.components.dataGridRowBorderHover}`,
        borderRadius: cellOutlineBorderRadius,
      },
    }),
  };
};
