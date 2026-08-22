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

export const CONTROL_COL_WIDTH = 24;
export const SELECT_COL_WIDTH = 24;
export const DEFAULT_COL_WIDTH = 180;
export const MIN_COL_WIDTH = 60;
const RESIZE_HANDLE_WIDTH = 4;

export const getTanStackDataGridStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  }),

  toolbar: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.xs}`,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    flexShrink: 0,
    minHeight: 40,
    zIndex: 3,
    '@media (max-width: 575px)': {
      gap: euiTheme.size.xs,
      padding: euiTheme.size.xs,
      '.euiDataGridToolbarControl .euiButtonEmpty__text': {
        display: 'none',
      },
    },
  }),

  contentArea: css({
    display: 'flex',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  }),

  scrollContainer: css({
    flex: 1,
    overflow: 'auto',
    position: 'relative',
    willChange: 'scroll-position',
    minWidth: 0,
    height: '100%',
    overscrollBehavior: 'contain',
  }),

  // Header
  headerRow: css({
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    width: '100%',
    minWidth: 0,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderBottom: euiTheme.border.thin,
  }),

  headerCell: css({
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: euiTheme.size.xs,
    padding: 'var(--tsg-cell-padding-v, 4px) var(--tsg-cell-padding-h, 8px)',
    fontWeight: euiTheme.font.weight.semiBold,
    fontSize: 'var(--tsg-font-size, 14px)',
    lineHeight: 1.5,
    overflow: 'hidden',
    borderRight: euiTheme.border.thin,
    flexShrink: 0,
    userSelect: 'none',
    '&:last-child': { borderRight: 'none' },
  }),

  headerCellSortable: css({
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
  }),

  headerCellText: css`
    display: -webkit-box;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--tsg-header-max-lines, 1);
  `,

  headerCellTextAuto: css({
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-word',
    whiteSpace: 'normal',
  }),

  sortIndicator: css({
    flexShrink: 0,
    color: euiTheme.colors.textSubdued,
    fontSize: euiTheme.size.m,
  }),

  resizeHandle: css({
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: RESIZE_HANDLE_WIDTH * 2,
    cursor: 'col-resize',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&::after': {
      content: '""',
      width: RESIZE_HANDLE_WIDTH / 2,
      height: '60%',
      borderRadius: RESIZE_HANDLE_WIDTH,
      backgroundColor: 'transparent',
      transition: 'background-color 150ms ease',
    },
    '&:hover::after': {
      backgroundColor: euiTheme.colors.borderBasePlain,
    },
  }),

  resizeHandleActive: css({
    '&::after': {
      backgroundColor: euiTheme.colors.borderBasePlain,
    },
  }),

  // Virtualized body
  virtualOuter: css({
    position: 'relative',
  }),

  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    willChange: 'transform',
  }),

  row: css({
    display: 'flex',
    height: '100%',
    width: '100%',
    minWidth: 0,
    borderBottom: euiTheme.border.thin,
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
  }),

  rowAutoHeight: css({
    height: 'auto',
    minHeight: 'var(--tsg-row-min-height, 28px)',
    alignItems: 'stretch',
  }),

  rowExpanded: css({
    backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    },
  }),

  cell: css({
    display: 'flex',
    alignItems: 'flex-start',
    padding: 'var(--tsg-cell-padding-v, 4px) var(--tsg-cell-padding-h, 8px)',
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
    lineHeight: 1.5,
    fontSize: 'var(--tsg-font-size, 14px)',
    '&:last-child': { borderRight: 'none' },
  }),

  cellContent: css`
    display: -webkit-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--tsg-body-max-lines, 1);
  `,

  cellContentAuto: css({
    minWidth: 0,
    width: '100%',
    flex: 1,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  }),

  controlCell: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: euiTheme.size.xs,
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
  }),

  controlHeaderCell: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
  }),

  summaryCell: css({
    // Flex item of the row: take remaining width without overflowing it.
    flex: 1,
    width: 0,
    minWidth: 0,
    padding: 'var(--tsg-cell-padding-v, 4px) var(--tsg-cell-padding-h, 8px)',
    overflow: 'hidden',
    lineHeight: 1.5,
    fontSize: 'var(--tsg-font-size, 14px)',
    boxSizing: 'border-box',
    // Match EuiDataGrid lineCount cells: wrap at the cell width, then clamp to body lines.
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    // The description list must stay `display: block` so inline title/value pairs wrap.
    // Do not put -webkit-box on the <dl> — that turns dt/dd into flex items and forces a single line.
    '.unifiedDataTable__descriptionList': {
      display: 'block',
      margin: 0,
      width: '100%',
      minWidth: 0,
      whiteSpace: 'normal',
    },
    '.unifiedDataTable__cellValue': {
      fontFamily: euiTheme.font.familyCode,
    },
  }),

  summaryCellContent: css`
    display: -webkit-box;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--tsg-body-max-lines, 1);
  `,

  summaryCellContentAuto: css({
    width: '100%',
    minWidth: 0,
    whiteSpace: 'normal',
  }),

  timestampCell: css({
    fontFamily: euiTheme.font.familyCode,
  }),

  loadingOverlay: css({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${euiTheme.colors.backgroundBasePlain}80`,
    zIndex: 3,
  }),

  // -- Expandable cell (click to expand) --
  expandableCell: css({
    cursor: 'pointer',
  }),

  // -- Cell actions (hover overlay) --
  cellWithActions: css({
    position: 'relative',
    '&:hover .tsg-cellActions': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  }),

  cellActions: css({
    position: 'absolute',
    right: 2,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: 2,
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 100ms ease',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    borderRadius: euiTheme.border.radius.small,
    boxShadow:
      euiTheme.levels.menu !== undefined
        ? `0 1px 4px ${euiTheme.colors.shadow}`
        : `0 1px 3px rgba(0,0,0,.15)`,
    padding: '1px 2px',
    zIndex: 1,
  }),

  // -- Cell popover --
  cellPopoverBackdrop: css({
    position: 'fixed',
    inset: 0,
    zIndex: 999,
  }),

  cellPopover: css({
    position: 'fixed',
    zIndex: 1000,
    minWidth: 200,
    maxWidth: 500,
    maxHeight: 400,
    overflow: 'auto',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.medium,
    boxShadow: `0 4px 16px ${euiTheme.colors.shadow ?? 'rgba(0,0,0,.15)'}`,
    padding: euiTheme.size.m,
    fontSize: euiTheme.size.m,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),

  cellPopoverHeader: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: euiTheme.size.s,
    paddingBottom: euiTheme.size.xs,
    borderBottom: euiTheme.border.thin,
    fontWeight: euiTheme.font.weight.semiBold,
    fontSize: euiTheme.size.m,
    gap: euiTheme.size.xs,
  }),

  cellPopoverBody: css({
    maxHeight: 320,
    overflow: 'auto',
  }),

  // -- Keyboard focus ring --
  focusedCell: css({
    outline: `2px solid ${euiTheme.colors.primary}`,
    outlineOffset: -2,
    zIndex: 1,
  }),

  // -- Row selection --
  selectCell: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
    width: SELECT_COL_WIDTH,
  }),

  selectHeaderCell: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
    width: SELECT_COL_WIDTH,
  }),

  selectedRow: css({
    backgroundColor: `${euiTheme.colors.primary}10`,
  }),

  // -- Column drag reorder --
  headerCellDragging: css({
    opacity: 0.5,
    cursor: 'grabbing',
  }),

  headerCellDragOver: css({
    borderLeft: `2px solid ${euiTheme.colors.primary}`,
  }),

  headerCellDraggable: css({
    cursor: 'grab',
  }),

  headerCellWithActions: css({
    '&:hover [data-test-subj^="dataGridHeaderCellActionButton-"]': {
      opacity: 1,
    },
  }),

  headerActionsButton: css({
    flexShrink: 0,
    opacity: 0.5,
    transition: 'opacity 100ms ease',
    '&:hover, &:focus': {
      opacity: 1,
    },
  }),

  // -- Empty state --
  emptyState: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${euiTheme.size.xxl} ${euiTheme.size.xl}`,
    textAlign: 'center',
    color: euiTheme.colors.textSubdued,
    gap: euiTheme.size.m,
    minHeight: 200,
  }),

  // -- Toolbar enhancements --
  toolbarRight: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    marginLeft: 'auto',
    minWidth: 0,
  }),

  toolbarControlGroup: css({
    position: 'relative',
    overflow: 'hidden',
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.small,
    display: 'inline-flex',
    alignItems: 'stretch',
    flexShrink: 0,
    '> *': {
      inlineSize: euiTheme.size.xl,
      blockSize: euiTheme.size.xl,
      borderRadius: 0,
    },
    '> * + *': {
      borderInlineStart: euiTheme.border.thin,
    },
    '.euiToolTipAnchor': {
      display: 'inline-flex',
    },
  }),

  // -- Full screen mode --
  fullScreen: css({
    position: 'fixed',
    inset: 0,
    width: '100dvw',
    height: '100dvh',
    zIndex: euiTheme.levels.mask,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  }),

  // -- Find in table --
  findBar: css({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    borderBottom: euiTheme.border.thin,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    flexShrink: 0,
  }),

  findInput: css({
    minWidth: 200,
  }),

  findCounter: css({
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    minWidth: 50,
    textAlign: 'center',
  }),

  searchHighlight: css({
    backgroundColor: '#FDD835',
    color: '#000',
    borderRadius: 2,
    padding: '0 1px',
  }),

  searchHighlightActive: css({
    backgroundColor: '#F57C00',
    color: '#FFF',
    borderRadius: 2,
    padding: '0 1px',
    outline: `1px solid ${euiTheme.colors.primary}`,
  }),
});
