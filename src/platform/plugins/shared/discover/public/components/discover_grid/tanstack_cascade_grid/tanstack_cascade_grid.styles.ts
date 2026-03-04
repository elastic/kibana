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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${euiTheme.size.s} 0`,
    flexShrink: 0,
    gap: euiTheme.size.s,
    flexWrap: 'wrap',
  }),

  toolbarRight: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
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
  }),

  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  }),

  // -- Group row (matches CascadeRowPrimitive size="s" = 32px) --
  groupRow: css({
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: `0 ${euiTheme.size.s}`,
    height: 32,
    borderBottom: euiTheme.border.thin,
    transition: 'background-color 100ms ease',
    userSelect: 'none',
    gap: euiTheme.size.xs,
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
    fontWeight: euiTheme.font.weight.semiBold,
  }),

  // Title slot: 4/10 flex growth
  groupTitle: css({
    flex: '4 1 0',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: euiTheme.font.scale.s * euiTheme.base,
    fontWeight: euiTheme.font.weight.semiBold,
    '& h4': {
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontSize: 'inherit',
      fontWeight: 'inherit',
    },
  }),

  groupTitleBlank: css({
    fontStyle: 'italic',
    color: euiTheme.colors.textSubdued,
  }),

  // Meta slots: 6/10 flex growth
  groupMeta: css({
    flex: '6 1 0',
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.m,
    overflow: 'hidden',
    justifyContent: 'space-between',
  }),

  metaSlot: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: euiTheme.font.scale.s * euiTheme.base,
  }),

  metaLabel: css({
    fontWeight: euiTheme.font.weight.bold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),

  numberBadge: css({
    width: '7ch',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: euiTheme.font.weight.semiBold,
    flexShrink: 0,
  }),

  textBadge: css({
    maxWidth: '20ch',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),

  actionsBtn: css({
    flexShrink: 0,
    marginLeft: 'auto',
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
