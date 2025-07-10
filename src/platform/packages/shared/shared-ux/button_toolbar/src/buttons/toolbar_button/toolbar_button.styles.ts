/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme } from '@elastic/eui';

export const fontWeightDefinitions = (euiTheme: UseEuiTheme['euiTheme']) => ({
  bold: euiTheme.font.weight.bold,
  normal: euiTheme.font.weight.regular,
});

export const ToolbarButtonStyles = ({ euiTheme }: UseEuiTheme) => {
  const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

  return {
    default: isAmsterdam
      ? {
          // style declaration carried over from https://github.com/elastic/kibana/blob/v8.10.4/src/plugins/kibana_react/public/toolbar_button/toolbar_button.scss
          // informed by issue https://github.com/elastic/eui/issues/4730
          borderStyle: 'solid',
          border: euiTheme.border.thin,
          borderColor: euiTheme.border.color,
        }
      : {
          // manual border override to ensure disabled buttons have a border to align with EuiButtonGroup styles
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        },
    emptyButton: {
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      color: `${euiTheme.colors.textParagraph}`,
    },
    buttonPositions: {
      left: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      },
      right: {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderLeft: 'none',
      },
      center: {
        borderRadius: 0,
        borderLeft: 'none',
      },
    },
  };
};
