/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, hexToRgb } from '@elastic/eui';

const BORDER_WIDTH = '1px';
const SHADOW_WIDTH = '20%';

// Using a gradient helps to easily position elements on top of it.
// For example, the background of the selected tab will cover it.
export const getTabsShadowGradient = ({ euiTheme, colorMode }: UseEuiTheme<{}>) => {
  const rgbForBorderColor = hexToRgb(euiTheme.colors.lightShade);

  // `1px` is for the border emulation

  if (colorMode === 'DARK') {
    // will render as a top border
    return `linear-gradient(
      180deg,
      rgba(${rgbForBorderColor}, 1) 0px,
      rgba(${rgbForBorderColor}, 1) ${BORDER_WIDTH},
      rgba(${rgbForBorderColor}, 0) ${BORDER_WIDTH}
    )`;
  }

  const rgbForLightMode = hexToRgb(euiTheme.colors.shadow);
  // will render as a top border and transition to a top shadow
  return `linear-gradient(
    180deg,
    rgba(${rgbForBorderColor}, 1) 0px,
    rgba(${rgbForBorderColor}, 1) ${BORDER_WIDTH},
    rgba(${rgbForLightMode}, 0.07) ${BORDER_WIDTH},
    rgba(${rgbForLightMode}, 0.02) ${SHADOW_WIDTH}
  )`;
};
