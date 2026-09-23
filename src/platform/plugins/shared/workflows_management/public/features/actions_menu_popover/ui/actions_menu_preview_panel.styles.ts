/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { actionIconTileStyles } from './action_icon_tile.styles';

/**
 * Layout that EUI components cannot express on their own:
 * split-pane overflow, resource hit targets, and full-width step rows.
 * Typography and chrome belong on EUI components.
 */
export const panelStyles = {
  fill: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  }),
  scroll: css({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  }),
  sectionHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      padding: `${euiTheme.size.m} ${euiTheme.size.base} 0`,
      marginBottom: euiTheme.size.m,
    }),
  stepListScroll: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: `0 ${euiTheme.size.base} ${euiTheme.size.base}`,
    }),
  stepListPanel: css({
    width: '100%',
    overflow: 'hidden',
  }),
  resourceInset: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.base,
    }),
  resourceRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      width: '100%',
      padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
      border: 'none',
      background: 'none',
      textAlign: 'left',
      textDecoration: 'none',
      color: 'inherit',
      cursor: 'pointer',
      '&:hover, &:focus': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        textDecoration: 'none',
      },
    }),
};

/** Custom because of shared category icon tiles + full-width row layout. */
export const previewStepRowStyles = {
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      paddingRight: euiTheme.size.base,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      '&:last-child': {
        borderBottom: 'none',
      },
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
      // Space is always reserved; reveal on row hover / keyboard focus.
      '&:hover [data-row-actions], &:focus-within [data-row-actions]': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    }),
  rowMain: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minWidth: 0,
      padding: `${euiTheme.size.m} 0 ${euiTheme.size.m} ${euiTheme.size.base}`,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      color: 'inherit',
    }),
  rowActions: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      opacity: 0,
      pointerEvents: 'none',
    }),
  truncate: css({
    minWidth: 0,
  }),
  ...actionIconTileStyles,
};
