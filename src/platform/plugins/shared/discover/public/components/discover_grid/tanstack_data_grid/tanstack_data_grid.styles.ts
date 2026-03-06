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

export const CONTROL_COL_WIDTH = 40;
export const SELECT_COL_WIDTH = 32;
export const DEFAULT_COL_WIDTH = 180;
export const MIN_COL_WIDTH = 60;
const RESIZE_HANDLE_WIDTH = 4;
const ROW_HEIGHT_PX = 34;

export const getTanStackDataGridStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  }),

  toolbar: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    borderBottom: euiTheme.border.thin,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    flexShrink: 0,
    minHeight: 40,
  }),

  contentArea: css({
    display: 'flex',
    flex: 1,
    minHeight: 0,
  }),

  scrollContainer: css({
    flex: 1,
    overflow: 'auto',
    position: 'relative',
    willChange: 'scroll-position',
    minWidth: 0,
  }),

  // Header
  headerRow: css({
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderBottom: `2px solid ${euiTheme.colors.borderBaseFormsControl}`,
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

  headerCellText: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 'var(--tsg-header-max-lines, 1)',
    wordBreak: 'break-word',
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
      backgroundColor: euiTheme.colors.borderBaseFormsControl,
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
    borderBottom: euiTheme.border.thin,
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
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

  cellContent: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flex: 1,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 'var(--tsg-body-max-lines, 1)',
    wordBreak: 'break-word',
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
    flex: 1,
    padding: 'var(--tsg-cell-padding-v, 4px) var(--tsg-cell-padding-h, 8px)',
    overflow: 'hidden',
    minWidth: 0,
    lineHeight: 1.5,
    fontSize: 'var(--tsg-font-size, 14px)',
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

  // -- Grouped mode --
  groupRow: css({
    display: 'flex',
    borderBottom: euiTheme.border.thin,
    boxSizing: 'border-box',
    cursor: 'pointer',
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
  }),

  groupRowExpanded: css({
    backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    borderBottom: 'none',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    },
  }),

  groupChevronCell: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: CONTROL_COL_WIDTH,
    flexShrink: 0,
    borderRight: euiTheme.border.thin,
    transition: 'transform 150ms ease',
  }),

  groupChevronRotated: css({
    '& svg': {
      transform: 'rotate(90deg)',
    },
  }),

  groupLabel: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    padding: '0 var(--tsg-cell-padding-h, 8px)',
    fontWeight: euiTheme.font.weight.semiBold,
    fontSize: 'var(--tsg-font-size, 14px)',
    flex: 1,
    overflow: 'hidden',
  }),

  groupLabelField: css({
    color: euiTheme.colors.textSubdued,
    fontWeight: euiTheme.font.weight.regular,
  }),

  groupCount: css({
    marginLeft: 'auto',
    paddingRight: euiTheme.size.s,
    color: euiTheme.colors.textSubdued,
    fontSize: euiTheme.size.m,
    flexShrink: 0,
  }),

  groupSubPanel: css({
    borderBottom: `2px solid ${euiTheme.colors.borderBaseFormsControl}`,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    overflow: 'hidden',
  }),

  subTable: css({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: euiTheme.size.m,
  }),

  subTableHeader: css({
    position: 'sticky',
    top: 0,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    '& th': {
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      fontWeight: euiTheme.font.weight.semiBold,
      textAlign: 'left',
      borderBottom: euiTheme.border.thin,
      whiteSpace: 'nowrap',
    },
  }),

  subTableRow: css({
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
    '& td': {
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      borderBottom: euiTheme.border.thin,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 250,
    },
  }),

  subTableBadge: css({
    marginLeft: euiTheme.size.xs,
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
    boxShadow: euiTheme.levels.menu !== undefined
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
  }),

  selectionBar: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    borderBottom: euiTheme.border.thin,
    backgroundColor: `${euiTheme.colors.primary}10`,
    flexShrink: 0,
    minHeight: 36,
  }),

  // -- Full screen mode --
  fullScreen: css({
    position: 'fixed',
    inset: 0,
    zIndex: 999,
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
