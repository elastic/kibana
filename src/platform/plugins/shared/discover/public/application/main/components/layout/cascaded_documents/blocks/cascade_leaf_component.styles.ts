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

export const getCustomCascadeGridBodyStyle = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    '& .euiDataGridHeader': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '& .euiDataGridRow': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.unifiedDataTableToolbar:has(+ .euiDataGrid__content &)': {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    '.unifiedDataTableToolbar:has(+ .euiDataGrid__content &) .unifiedDataTableToolbarControlGroup':
      {
        backgroundColor: euiTheme.colors.backgroundBasePlain,
      },
  }),
  virtualizerContainer: css({
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    position: 'relative',
    scrollbarWidth: 'thin',
  }),
  virtualizerInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    overflowAnchor: 'none',
    // Promote to GPU layer for smoother transform animations
    willChange: 'transform',

    '& > .euiDataGridRow:last-child .euiDataGridRowCell:not(.euiDataGridFooterCell)': {
      borderBlockEnd: 'none',
    },
  }),
  displayFlex: css({ display: 'flex' }),
});
