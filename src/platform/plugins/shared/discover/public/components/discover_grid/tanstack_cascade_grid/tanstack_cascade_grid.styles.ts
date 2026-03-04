/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const getCascadeGridStyles = (euiTheme: EuiThemeComputed) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: `0 ${euiTheme.size.s} ${euiTheme.size.s}`,
  }),

  fullScreen: css({
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    padding: euiTheme.size.s,
  }),

  toolbar: css({
    padding: `${euiTheme.size.s} 0`,
    flexShrink: 0,
  }),

  contentArea: css({
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  }),

  scrollContainer: css({
    flex: 1,
    overflow: 'auto',
    position: 'relative',
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.small,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    '&:focus': {
      outline: 'none',
    },
  }),

  virtualOuter: css({
    position: 'relative',
    width: '100%',
    contain: 'layout style',
  }),

  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    willChange: 'transform',
  }),

  // -- Group row (matches CascadeRowPrimitive) --
  groupRow: css({
    cursor: 'pointer',
    borderBottom: euiTheme.border.thin,
    transition: 'background-color 100ms ease',
    userSelect: 'none',
    outline: 'none',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '&:focus-visible': {
      boxShadow: `inset 0 0 0 2px ${euiTheme.colors.primary}`,
    },
  }),

  groupRowExpanded: css({
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  }),

  rowHeader: css({
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    minHeight: 32,
  }),

  groupTitle: css({
    minWidth: 0,
    overflow: 'hidden',
  }),

  titleText: css({
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 'inherit',
    fontWeight: 'inherit',
  }),

  groupTitleBlank: css({
    fontStyle: 'italic',
    color: euiTheme.colors.textSubdued,
  }),

  metaLabel: css({
    whiteSpace: 'nowrap',
  }),

  numberBadge: css({
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    '& h5': {
      margin: 0,
      fontSize: 'inherit',
    },
  }),

  textBadge: css({
    maxWidth: '20ch',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),

  // -- Documents panel (expanded leaf — wraps UnifiedDataTable) --
  docsPanel: css({
    borderBottom: euiTheme.border.thin,
    position: 'relative',
    overflow: 'hidden',
  }),

  docsPanelInner: css({
    height: '100%',
    borderRadius: euiTheme.border.radius.small,
    overflow: 'hidden',
    margin: `0 ${euiTheme.size.s} ${euiTheme.size.xs}`,
  }),

  docsPanelLoading: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: euiTheme.size.l,
    gap: euiTheme.size.s,
  }),

  docsPanelError: css({
    display: 'flex',
    alignItems: 'center',
    padding: euiTheme.size.m,
    gap: euiTheme.size.s,
    color: euiTheme.colors.textDanger,
  }),

  loadingOverlay: css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 10,
  }),

  emptyState: css({
    padding: euiTheme.size.xxl,
  }),
});
