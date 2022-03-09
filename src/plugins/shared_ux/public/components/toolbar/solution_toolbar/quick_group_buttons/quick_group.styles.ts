/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseEuiTheme } from '@elastic/eui';

export const QuickGroupButtonStyles = ({ euiTheme }: UseEuiTheme) => {
  return {
    quickButtonGroupStyles: {
      borderRadius: euiTheme.border.radius.medium,
    },
    quickButtonStyles: {
      backgroundColor: `${euiTheme.colors.emptyShade} !important`,
      '&.euiButtonGroupButton': {
        borderWidth: `${euiTheme.border.width.thin} !important`,
        borderStyle: `solid !important`,
        borderColor: `${euiTheme.border.color} !important`,
      },
      '&:first-of-type': {
        borderTopLeftRadius: `${euiTheme.border.radius.medium} !important`,
        borderBottomLeftRadius: `${euiTheme.border.radius.medium} !important`,
      },
      '&:last-of-type': {
        borderTopRightRadius: `${euiTheme.border.radius.medium} !important`,
        borderBottomRightRadius: `${euiTheme.border.radius.medium} !important`,
      },
      '&:hover': {
        backgroundColor: `${euiTheme.colors.lightShade} !important`,
      },
    },
  };
};
