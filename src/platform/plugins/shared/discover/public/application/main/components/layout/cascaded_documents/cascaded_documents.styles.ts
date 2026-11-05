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
    '--kbn-data-cascade-cell-border-radius': '0px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: `0 ${euiTheme.size.s} ${euiTheme.size.s}`,

    // The inline sticky header only renders for expanded rows, and the grid toolbar is
    // portaled into it once the leaf mounts. Keying the padding on the toolbar being present
    // (`:has(...)`) made the header padding change after the row had already expanded, shifting
    // the row title down and then back up. The padding is therefore set for every expanded row
    // from the first frame, so it never changes when the toolbar mounts.
    '& [role="row"] [data-test-subj="dataCascadeInlineStickyHeader"]': {
      paddingBottom: 0,
    },

    // While the header is pinned it needs a gap above the title. The row's own top padding already
    // provides that gap while the header is in its natural position, so the negative margin cancels
    // the added padding to keep the header's footprint unchanged. This avoids shifting the title and the
    // content below it by `size.s` when a row is expanded at the top of the list or starts to stick.
    '& [role="row"][data-active-sticky="true"] [data-test-subj="dataCascadeInlineStickyHeader"]': {
      marginTop: `calc(${euiTheme.size.s} * -1)`,
    },

    '& [role="row"] [data-test-subj="sticky-header-extension-point"]': {
      border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
      borderRadius: `${euiTheme.border.radius.inline} ${euiTheme.border.radius.inline} 0 0`,
      clipPath: `inset(0px round ${euiTheme.border.radius.inline} ${euiTheme.border.radius.inline} 0 0)`,
      overflow: 'hidden',
    },

    // EUI Data Grid uses fixed positioning to render
    // full screen mode, and since data cascade rows have a transform applied on them
    // the full screen grid ends up being constrained to the bounds of the row,
    // see https://www.w3.org/TR/css-transforms-1/#transform-rendering.
    // So whilst the fullscreen mode is active we remove the transform
    // on the row to ensure the full screen grid can take up the entire screen.
    '&:has(.euiDataGrid--fullScreen) *:not(.euiDataGrid--fullScreen *)': {
      transform: 'none !important',
    },

    // Remove the contain property from the data cascade scroll container when full screen mode is active
    '&:has(.euiDataGrid--fullScreen) [data-test-subj="dataCascadeScrollContainer"]': {
      contain: 'none',
    },

    // Remove the contain property from the data cascade rows when full screen mode is active
    // to ensure the full screen grid can take up the entire screen.
    '&:has(.euiDataGrid--fullScreen) [role="row"][data-row-type]': {
      contain: 'none',
    },

    // Disable cascade cell content clipping in full screen mode so the grid
    // can extend to the full width of the screen.
    '&:has(.euiDataGrid--fullScreen) [role="gridcell"] *:not(.euiDataGrid--fullScreen *)': {
      clipPath: 'unset',
    },
  }),

  textBadge: css({
    textAlign: 'center',
  }),
});
