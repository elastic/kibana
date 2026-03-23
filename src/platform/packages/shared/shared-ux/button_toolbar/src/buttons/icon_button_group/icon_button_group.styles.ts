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

export const getIconButtonStyles = ({ euiTheme }: UseEuiTheme) => {
  const border = `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`;

  return css`
    &.euiButtonGroupButton {
      background-color: ${euiTheme.colors.emptyShade} !important;
      border: ${border} !important;
      border-right: none !important;

      &:first-of-type {
        border-top-left-radius: ${euiTheme.border.radius.medium} !important;
        border-bottom-left-radius: ${euiTheme.border.radius.medium} !important;
      }

      &:last-of-type {
        border-right: ${border} !important;
        border-top-right-radius: ${euiTheme.border.radius.medium} !important;
        border-bottom-right-radius: ${euiTheme.border.radius.medium} !important;
      }

      &:not(:first-child):not(.euiButtonGroupButton-isSelected):not(:disabled) {
        box-shadow: unset;
      }
    }
  `;
};

export const getIconButtonGroupStyles = ({ euiTheme }: UseEuiTheme) => {
  return css`
    .euiButtonGroup__buttons {
      border-radius: ${euiTheme.border.radius.medium};
    }
  `;
};
