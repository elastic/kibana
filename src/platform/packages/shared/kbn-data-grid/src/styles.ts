/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import type { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { cellActionsHostStyles } from './components/cell_actions_bubble/cell_actions_bubble_styles';
import {
  DATA_GRID_COLUMN_WIDTH_VAR_PREFIX,
  DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS,
  DATA_GRID_ROW_CLASS,
} from './constants';

export type DataGridStyles = ReturnType<typeof useMemoCss<typeof componentStyles>>;

export const getColumnWidthVar = (columnIndex: number) =>
  `${DATA_GRID_COLUMN_WIDTH_VAR_PREFIX}${columnIndex}`;

/** Fixed width columns follow a CSS variable, so resizing doesn't re-render the rows. */
export const getColumnLayoutStyles = (columnIndex: number, hasFixedWidth: boolean) =>
  hasFixedWidth
    ? css({ width: `var(${getColumnWidthVar(columnIndex)})`, flexShrink: 0 })
    : css({ flex: '1 1 0', minWidth: 0 });

// EuiPopover anchors to its own wrapper: overlay it on the expand icon (the trigger unmounts when the
// bubble collapses), fixed in the viewport because the portal sits outside the virtualized rows.
export const getPopoverAnchorStyles = ({ top, left, width, height }: DOMRect) =>
  css({
    position: 'fixed',
    display: 'block',
    top,
    left,
    width,
    height,
    pointerEvents: 'none',
  });

export const popoverContentStyles = css({
  maxInlineSize: 'min(75vw, 600px)',
  maxBlockSize: '50vh',
  overflow: 'auto',
  wordBreak: 'break-word',
});

export const componentStyles = {
  scrollContainer: (themeContext: UseEuiTheme) => {
    const { fontSize } = euiFontSize(themeContext, 's');

    return css({
      position: 'relative',
      blockSize: '100%',
      // Keeps rendering virtualized even if the parent doesn't constrain the height.
      maxBlockSize: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      fontSize,

      [`.${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}`]: {
        opacity: 0,
      },

      [`.${DATA_GRID_ROW_CLASS}:hover .${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}, [role="gridcell"]:focus-within .${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}`]:
        {
          opacity: 1,
        },
    });
  },
  cellWithActions: cellActionsHostStyles,
  stickyTop: css({
    position: 'sticky',
    top: 0,
    zIndex: 2,
  }),
  headerRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      backgroundColor: euiTheme.components.dataGridRowBackground,
      borderBottom: euiTheme.border.thin,
      fontWeight: euiTheme.font.weight.bold,
    }),
  headerCell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      minBlockSize: euiTheme.size.xl,
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }),
  resizeHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: euiTheme.size.s,
      cursor: 'col-resize',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&::after': {
        content: '""',
        width: euiTheme.size.xxs,
        height: '60%',
        borderRadius: euiTheme.size.xs,
        backgroundColor: 'transparent',
      },
      '&:hover::after': {
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    }),
  resizeHandleActive: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&::after': {
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    }),
  // Keeps many pinned rows from taking over the whole grid.
  pinnedRows: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxBlockSize: '40vh',
      overflowY: 'auto',
      borderBottom: `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePlain}`,
    }),
  virtualOuter: css({
    position: 'relative',
    inlineSize: '100%',
  }),
  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    inlineSize: '100%',
  }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      backgroundColor: euiTheme.components.dataGridRowBackground,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`,
      '&:hover': {
        backgroundColor: euiTheme.components.dataGridRowBackgroundHover,
      },
    }),
  rowStriped: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
      '&:hover': {
        backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStripedHover,
      },
    }),
  cell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      boxSizing: 'border-box',
      minWidth: 0,
      padding: euiTheme.size.s,
      overflowWrap: 'break-word',
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
    }),
};
