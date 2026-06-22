/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSizeFromScale, euiShadow } from '@elastic/eui';
import { css } from '@emotion/react';

export const visorWidthPercentage = 0.5;
export const dropdownWidthPercentage = 0.35;
const VISOR_INNER_PADDING = '2px';

export const visorStyles = (
  euiThemeContext: UseEuiTheme,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isInline: boolean
) => {
  const { euiTheme } = euiThemeContext;
  const fontSize = euiFontSizeFromScale('xs', euiTheme);
  const borderRadius = euiTheme.border.radius.medium;

  return {
    visorContainer: css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      width: 100%;
      min-height: calc(${euiTheme.size.xl} + ${VISOR_INNER_PADDING});
    `,
    visorWrapper: css`
      width: 100%;
    `,
    visorBox: css`
      border: 1px solid ${euiTheme.colors.borderBaseSubdued};
      border-radius: ${borderRadius};
      ${euiShadow(euiThemeContext, 'xs')}
      ${isInline ? 'flex-wrap: wrap;' : ''}
    `,
    comboBoxWrapper: css`
      justify-content: center;
      padding-left: ${euiTheme.size.xs};
      flex-grow: 1;
      max-width: ${isSpaceReduced ? `calc(${visorWidthPercentage * 100}%)` : `${comboBoxWidth}px`};
      overflow: hidden;
    `,
    separator: css`
      width: 1px;
      height: ${euiTheme.size.xl};
      flex-shrink: 0;
      align-self: stretch;
      position: relative;
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        width: 1px;
        height: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.borderBasePlain};
      }
    `,
    searchWrapper: css`
      justify-content: center;
      padding-right: ${euiTheme.size.xs};
      position: relative;
      ${isInline ? 'flex: 1 0 100%;' : ''}
      min-width: 0;
      ${isInline
        ? `border-top: 1px solid ${euiTheme.colors.borderBaseSubdued}; padding-right: 0;`
        : ''}

      .euiFormControlLayout--group {
        border-radius: ${isInline ? '0' : borderRadius};
      }
      .euiFormControlLayout--group::after {
        border: none;
      }

      .euiFormControlLayout__append {
        &::before {
          border: none;
        }
      }

      .kbnQueryBar__textarea {
        border-radius: ${isInline ? '0' : borderRadius} !important;
        font-size: ${fontSize} !important;
        padding-left: ${euiTheme.size.s} !important;
        padding-top: ${euiTheme.size.s} !important;
        box-shadow: none;
        &:focus,
        &:hover {
          box-shadow: none !important;
          outline: none !important;
        }
      }
    `,
    searchInner: css`
      width: 100%;
    `,
    submitButtonWrapper: css`
      padding-right: ${euiTheme.size.xs};
      padding-left: ${euiTheme.size.xs};
      flex-shrink: 0;
    `,
  };
};
