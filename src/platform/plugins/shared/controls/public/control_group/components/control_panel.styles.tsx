/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme, euiBreakpoint } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { ControlWidth } from '../../../common/types';

const euiSize = parseInt(euiThemeVars.euiSize, 10);

const smallControlWidth = euiSize * 14;
const mediumControlWidth = euiSize * 25;
const largeControlWidth = euiSize * 50;

export const controlWidthStyles = {
  small: css({
    minWidth: `${smallControlWidth}px`,
    width: `${smallControlWidth}px`,
  }),
  medium: css({
    minWidth: `${mediumControlWidth}px`,
    width: `${mediumControlWidth}px`,
  }),
  large: css({
    minWidth: `${largeControlWidth}px`,
    width: `${largeControlWidth}px`,
  }),
};

export const controlPanelWidthStyles = (width: boolean | ControlWidth | undefined) => {
  switch (width) {
    case 'small':
      return controlWidthStyles.small;
    case 'medium':
      return controlWidthStyles.medium;
    case 'large':
      return controlWidthStyles.large;
    default:
      return undefined;
  }
};

export const responsiveControlWidthStyles = (euiThemeContext: UseEuiTheme) => css`
  ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
    width: 100%;
    min-width: unset;
  }
`;
