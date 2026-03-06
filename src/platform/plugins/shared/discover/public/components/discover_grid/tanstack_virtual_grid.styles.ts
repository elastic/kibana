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

const EXPAND_COL_WIDTH = 36;
const TIMESTAMP_COL_WIDTH = 210;

export const getTanstackVirtualGridStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  }),
  toolbar: css({
    padding: euiTheme.size.s,
    borderBottom: euiTheme.border.thin,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    flexShrink: 0,
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

  // header
  headerRow: css({
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderBottom: euiTheme.border.thin,
    fontWeight: euiTheme.font.weight.semiBold,
    fontSize: euiTheme.size.m,
    lineHeight: `calc(${euiTheme.size.l} + ${euiTheme.size.xs})`,
  }),
  expandHeaderCell: css({
    flexShrink: 0,
    width: EXPAND_COL_WIDTH,
    borderRight: euiTheme.border.thin,
  }),
  timestampHeaderCell: css({
    flexShrink: 0,
    width: TIMESTAMP_COL_WIDTH,
    padding: `0 ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
  }),
  summaryHeaderCell: css({
    flex: 1,
    padding: `0 ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  }),

  // virtualised body
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
  virtualRow: css({
    display: 'flex',
    alignItems: 'stretch',
    height: '100%',
    borderBottom: euiTheme.border.thin,
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
  }),

  // cells
  expandCell: css({
    flexShrink: 0,
    width: EXPAND_COL_WIDTH,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: euiTheme.size.xs,
    borderRight: euiTheme.border.thin,
  }),
  timestampCell: css({
    flexShrink: 0,
    width: TIMESTAMP_COL_WIDTH,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
    fontSize: euiTheme.size.m,
    fontFamily: euiTheme.font.familyCode,
    lineHeight: 1.5,
  }),
  summaryCell: css({
    flex: 1,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    overflow: 'hidden',
    minWidth: 0,
    lineHeight: 1.5,
  }),

  // STATS ... BY column styles
  byHeaderCell: css({
    flex: 1,
    padding: `0 ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
    fontWeight: euiTheme.font.weight.bold,
    minWidth: 0,
  }),
  aggHeaderCell: css({
    flex: 1,
    padding: `0 ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
    minWidth: 0,
    '&:last-child': {
      borderRight: 'none',
    },
  }),
  byCell: css({
    flex: 1,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
    fontWeight: euiTheme.font.weight.semiBold,
    minWidth: 0,
  }),
  aggCell: css({
    flex: 1,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRight: euiTheme.border.thin,
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.size.m,
    minWidth: 0,
    '&:last-child': {
      borderRight: 'none',
    },
  }),
});
