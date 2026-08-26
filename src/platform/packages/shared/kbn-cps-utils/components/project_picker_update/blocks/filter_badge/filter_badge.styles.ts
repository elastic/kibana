/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { getEuiButtonColorValues, type UseEuiTheme } from '@elastic/eui';

export const filterBadgeStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const disabledColors = getEuiButtonColorValues(euiThemeContext, 'disabled');

  return {
    container: css({
      width: 'fit-content',
      '& [data-is-negated="true"]:before': {
        content: 'attr(data-negation-string)',
        display: 'inline-block',
        color: euiTheme.colors.danger,
        fontWeight: euiTheme.font.weight.bold,
        paddingRight: euiTheme.size.xs,
      },
    }),
    inactive: css({
      '--euiBadgeTextColor': disabledColors.color,
      '--euiBadgeBackgroundColor': disabledColors.backgroundColor,
      '--euiBadgeBackgroundHoverColor': disabledColors.backgroundHover,
      '--euiBadgeBackgroundActiveColor': disabledColors.backgroundActive,
      borderColor: disabledColors.borderColor || 'transparent',
    }),
  };
};
