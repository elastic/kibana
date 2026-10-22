/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize, mathWithUnits } from '@elastic/eui';
import { css } from '@emotion/react';
import type { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { cellActionsHostStyles } from './components/cell_actions_bubble/cell_actions_bubble_styles';
import {
  DATA_GRID_CELL_CONTENT_CLASS,
  DATA_GRID_HEADER_ROW_CLASS,
  DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS,
  DATA_GRID_ROW_CLASS,
} from './constants';

export type DataGridStyles = ReturnType<typeof useMemoCss<typeof componentStyles>>;

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
    const { euiTheme } = themeContext;
    // The sizes of EuiDataGrid: a step smaller than the font sizes of the same name.
    const fontSizes = {
      s: euiFontSize(themeContext, 'xs'),
      m: {
        fontSize: euiFontSize(themeContext, 's').fontSize,
        lineHeight: euiFontSize(themeContext, 'm').lineHeight,
      },
      l: {
        fontSize: euiFontSize(themeContext, 's').fontSize,
        lineHeight: euiFontSize(themeContext, 'm').lineHeight,
      },
    };
    const cellPaddings = {
      s: euiTheme.size.xs,
      m: mathWithUnits(euiTheme.size.m, (x) => x / 2),
      l: euiTheme.size.s,
    };
    const rowSelector = `.${DATA_GRID_ROW_CLASS}`;

    return css({
      position: 'relative',
      blockSize: '100%',
      // Keeps rendering virtualized even if the parent doesn't constrain the height.
      maxBlockSize: '100vh',
      overflow: 'auto',

      // Appearance, set through `data-` attributes on the grid, see `gridStyle`.
      ...Object.fromEntries(
        (['s', 'm', 'l'] as const).flatMap((size) => [
          [
            `&[data-font-size="${size}"]`,
            { fontSize: fontSizes[size].fontSize, lineHeight: fontSizes[size].lineHeight },
          ],
          [`&[data-cell-padding="${size}"]`, { '--kbnDataGridCellPadding': cellPaddings[size] }],
        ])
      ),
      [`${rowSelector}`]: {
        backgroundColor: euiTheme.components.dataGridRowBackground,
      },
      [`&:not([data-border="none"]) ${rowSelector}`]: {
        borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`,
      },
      [`&[data-border="all"] [role="gridcell"], &[data-border="all"] [role="columnheader"]`]: {
        borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`,
      },
      // The hover color is translucent: keep the opaque row color below it, so the sticky cells,
      // which inherit the background of the row, do not show the cells that scroll under them.
      [`&[data-row-hover="highlight"] ${rowSelector}:hover`]: {
        backgroundColor: euiTheme.components.dataGridRowBackground,
        backgroundImage: `linear-gradient(${euiTheme.components.dataGridRowBackgroundHover}, ${euiTheme.components.dataGridRowBackgroundHover})`,
      },
      [`&[data-stripes="true"] ${rowSelector}[data-striped="true"]`]: {
        backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
      },
      [`&[data-stripes="true"][data-row-hover="highlight"] ${rowSelector}[data-striped="true"]:hover`]:
        {
          backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStripedHover,
          backgroundImage: 'none',
        },
      [`.${DATA_GRID_HEADER_ROW_CLASS}`]: {
        backgroundColor: euiTheme.components.dataGridRowBackground,
        borderBottom: euiTheme.border.thin,
      },
      [`&[data-header="shade"] .${DATA_GRID_HEADER_ROW_CLASS}`]: {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },

      // Rows show a number of lines of text, or grow with their content.
      [`&[data-row-height="lines"] .${DATA_GRID_CELL_CONTENT_CLASS}`]: {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 'var(--kbnDataGridRowLines)',
        overflow: 'hidden',
        overflowWrap: 'anywhere',
      },
      [`.${DATA_GRID_CELL_CONTENT_CLASS}`]: {
        lineHeight: 'var(--kbnDataGridLineHeight, inherit)',
        // Like EuiDataGrid: text wraps (and keeps its line breaks) instead of being cut off.
        whiteSpace: 'pre-wrap',
      },

      [`.${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}`]: {
        opacity: 0,
      },

      [`${rowSelector}:hover .${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}, [role="gridcell"]:focus-within .${DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}`]:
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
    minInlineSize: '100%',
  }),
  headerRow: css({ display: 'flex' }),
  headerCell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      boxSizing: 'border-box',
      minBlockSize: euiTheme.size.xl,
      padding: `${euiTheme.size.xs} var(--kbnDataGridCellPadding, ${euiTheme.size.s})`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      fontWeight: euiTheme.font.weight.semiBold,
      color: euiTheme.colors.textSubdued,
      // The text of a header is not content to select and copy.
      userSelect: 'none',
    }),
  // A header of several lines starts at the top, so its text lines up with the cells below.
  headerCellMultiline: css({ alignItems: 'flex-start' }),
  headerContent: css({
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  headerContentClamped: css({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  }),
  // A header with a menu: the whole header opens it, so it shows it can be used.
  // Dragging a header to reorder the columns: the dragged one fades, a line marks where it goes.
  headerCellDragging: css({ opacity: 0.5 }),
  headerCellDropBefore: ({ euiTheme }: UseEuiTheme) =>
    css({ boxShadow: `inset ${euiTheme.border.width.thick} 0 0 ${euiTheme.colors.primary}` }),
  headerCellDropAfter: ({ euiTheme }: UseEuiTheme) =>
    css({ boxShadow: `inset -${euiTheme.border.width.thick} 0 0 ${euiTheme.colors.primary}` }),
  headerCellWithMenu: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseHighlighted },
    }),
  headerCellInteractive: css({
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    gap: 4,
    cursor: 'pointer',
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    font: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
  }),
  headerCellInteractiveMultiline: css({ alignItems: 'flex-start' }),
  // Room for the resize handle on the trailing edge.
  headerCellInteractiveResizable: css({ paddingInlineEnd: 8 }),
  // Where the popover of the menu hangs from: the bottom left of the header, under its text.
  headerCellPopoverAnchor: css({
    position: 'absolute',
    left: 'var(--kbnDataGridCellPadding, 8px)',
    bottom: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  }),
  resizeHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: euiTheme.size.s,
      cursor: 'col-resize',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&::after': {
        transition: 'background-color 150ms ease',
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
    minInlineSize: '100%',
  }),
  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
  }),
  row: css({ display: 'flex' }),
  // Control columns stay in view while the other columns scroll horizontally.
  cellSticky: css({
    position: 'sticky',
    zIndex: 1,
    background: 'inherit',
  }),
  // The sticky column next to the ones that scroll under it.
  cellStickyEdge: ({ euiTheme }: UseEuiTheme) =>
    css({
      // A line and a soft shadow towards the columns that scroll under it.
      boxShadow: `1px 0 0 ${euiTheme.colors.borderBaseProminent}, 2px 0 6px -1px ${euiTheme.colors.borderBaseProminent}`,
      '[data-sticky-side="right"]&': {
        boxShadow: `-1px 0 0 ${euiTheme.colors.borderBaseProminent}, -2px 0 6px -1px ${euiTheme.colors.borderBaseProminent}`,
      },
    }),
  // Control columns are no content to copy.
  cellNoSelect: css({ userSelect: 'none' }),
  // The content of a control column, like a checkbox or an icon, sits in the middle of its width.
  // The same padding (none) in the header and in the cells, so their content is on one center line.
  // The extra ampersands outweigh the rules of consumers made for EuiDataGrid's classes, which our
  // cells also have, that pad the header of some control columns differently than their cells.
  cellControl: css({
    display: 'flex',
    justifyContent: 'center',
    '&&&&': { paddingLeft: 0, paddingRight: 0 },
  }),
  // In a row of several lines the content stays at the top, next to the first line of text.
  cellControlBody: css({ alignItems: 'flex-start' }),
  // Shrink-wraps the content of a control cell, so it is centered like the header's, whatever width or margin it brings.
  cellControlContent: css({ display: 'inline-flex', '&& > *': { marginLeft: 0, marginRight: 0 } }),
  // The content of a control header is as wide as it is, so it can be centered.
  headerContentControl: css({ flex: '0 1 auto' }),
  spacer: css({ flexShrink: 0 }),
  cell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      flexShrink: 0,
      boxSizing: 'border-box',
      minWidth: 0,
      padding: 'var(--kbnDataGridCellPadding, 8px)',
      overflowWrap: 'break-word',
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
    }),
};
