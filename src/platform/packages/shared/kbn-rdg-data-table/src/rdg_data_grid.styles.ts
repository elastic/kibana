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

/** Maps EUI tokens to react-data-grid's CSS variables; react-data-grid's own styles are in a cascade layer, so these win. */
export const getRdgDataGridStyles = (euiTheme: EuiThemeComputed, lineClamp: number) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  }),
  toolbar: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: euiTheme.size.s,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    borderBottom: euiTheme.border.thin,
  }),
  grid: css({
    '--rdg-color': euiTheme.colors.textParagraph,
    '--rdg-border-color': euiTheme.border.color,
    '--rdg-summary-border-color': euiTheme.border.color,
    '--rdg-background-color': euiTheme.colors.backgroundBasePlain,
    '--rdg-header-background-color': euiTheme.colors.backgroundBasePlain,
    '--rdg-header-draggable-background-color': euiTheme.colors.backgroundBaseSubdued,
    '--rdg-row-hover-background-color': euiTheme.colors.backgroundBaseInteractiveHover,
    '--rdg-row-selected-background-color': euiTheme.colors.backgroundBaseInteractiveSelect,
    '--rdg-row-selected-hover-background-color': euiTheme.colors.backgroundBaseInteractiveSelect,
    '--rdg-checkbox-focus-color': euiTheme.colors.primary,
    '--rdg-selection-color': euiTheme.colors.primary,
    '--rdg-font-size': 'var(--rdg-kbn-font-size)',
    flex: '1 1 auto',
    blockSize: 'auto',
    minHeight: 0,
    fontFamily: euiTheme.font.family,
    '.rdg-header-row': {
      fontWeight: euiTheme.font.weight.bold,
    },
    '.rdg-row.rdgKbn__row--expanded': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    },
    // Multi-line cells: react-data-grid uses the row height as the line height of the row.
    '.rdgKbn__cellContent': {
      lineHeight: 'var(--rdg-kbn-line-height)',
      paddingBlock: 'var(--rdg-kbn-cell-padding)',
      whiteSpace: 'normal',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: lineClamp,
      wordBreak: 'break-word',
    },
    '.rdgKbn__control': {
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      gap: euiTheme.size.xxs,
    },
  }),
  noResults: css({
    padding: euiTheme.size.l,
  }),
  pagination: css({
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    borderTop: euiTheme.border.thin,
  }),
});
