/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { EuiThemeShape } from '@elastic/eui';

export const cascadedDocumentsStyles = ({ euiTheme }: { euiTheme: EuiThemeShape }) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: `0 ${euiTheme.size.s} ${euiTheme.size.s}`,

    // EUI Data Grid uses fixed positioning to render
    // full screen mode, and since data cascade rows have a transform applied on them
    // the full screen grid ends up being constrained to the bounds of the row,
    // see https://www.w3.org/TR/css-transforms-1/#transform-rendering.
    // So whilst the fullscreen mode is active we remove the transform
    // on the row to ensure the full screen grid can take up the entire screen.
    '&:has(.euiDataGrid--fullScreen) *:not(.euiDataGrid--fullScreen *)': {
      transform: 'none !important',
    },

    // This is also required because we clip the rendered content
    // in the cascade grid cells to have rounded corners
    // but in full screen mode we want to disable that clipping,
    // so that content can extend to the full width of the screen
    '&:has(.euiDataGrid--fullScreen) [role="gridcell"] *:not(.euiDataGrid--fullScreen *)': {
      clipPath: 'unset',
    },
  }),

  textBadge: css({
    textAlign: 'center',
  }),
});
