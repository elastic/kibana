/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, hexToRgb, transparentize } from '@elastic/eui';

// These need to be functions to get theme values
export const getVisVariables = ({ euiTheme }: UseEuiTheme) => {
  const fullShadeRgb = hexToRgb(euiTheme.colors.fullShade);
  const emptyShadeRgb = hexToRgb(euiTheme.colors.emptyShade);

  return {
    // Text colors
    tvbTextColor: `rgba(${fullShadeRgb}, 0.6)`,
    tvbTextColorReversed: `rgba(${emptyShadeRgb}, 0.6)`,

    // Value colors
    tvbValueColor: `rgba(${fullShadeRgb}, 0.7)`,
    tvbValueColorReversed: `rgba(${emptyShadeRgb}, 0.8)`,

    // Background colors
    tvbHoverBackgroundColor: `rgba(${fullShadeRgb}, 0.1)`,
    tvbHoverBackgroundColorReversed: `rgba(${emptyShadeRgb}, 0.1)`,
  };
};
