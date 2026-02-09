/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const visorWidthPercentage = 0.5;
export const dropdownWidthPercentage = 0.35;
const visorGradientPadding = '1px';
const visorGradient =
  'linear-gradient(104.14deg, rgb(97, 162, 255) 18.35%, rgb(138, 130, 232) 51.95%, rgb(216, 70, 187) 88.68%, rgb(255, 39, 165) 112.9%);';

export const visorStyles = (
  euiTheme: EuiThemeComputed,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isVisible: boolean,
  isDarkMode: boolean
) => {
  const visorBoxShadow = isDarkMode
    ? '0px 6px 14px 0px rgba(137, 157, 170, 0.2)'
    : '0px 6px 14px 0px rgba(11, 14, 22, 0.05)';

  const totalHeight = `calc(${euiTheme.size.xl} + 2*${visorGradientPadding})`;

  const gradientBoxStyles = {
    background: visorGradient,
    padding: visorGradientPadding,
    borderRadius: `calc(${euiTheme.size.s} + 1px)`,
    boxShadow: visorBoxShadow,
  };

  return {
    visorContainer: {
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      width: isSpaceReduced ? '98%' : `calc(${visorWidthPercentage * 100}% )`,
      margin: isVisible ? `0 auto ${euiTheme.size.base}` : '0 auto 0',
      height: isVisible ? `${totalHeight}` : '0',
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
      transition: 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    visorWrapper: {
      width: `calc(100% - ${euiTheme.size.xl})`,
    },
    visorGradientBox: {
      ...gradientBoxStyles,
    },
    comboBoxWrapper: {
      background: euiTheme.colors.backgroundBasePlain,
      justifyContent: 'center',
      borderBottomLeftRadius: euiTheme.size.s,
      borderTopLeftRadius: euiTheme.size.s,
      paddingLeft: '2px',
      flexGrow: 1,
      maxWidth: `${
        isSpaceReduced ? `calc(${visorWidthPercentage * 100}% )` : `${comboBoxWidth}px`
      }`,
      overflow: 'hidden',
    },
    closeButtonWrapper: {
      ...gradientBoxStyles,
      marginLeft: euiTheme.size.xs,
    },
    closeButton: {
      borderRadius: euiTheme.size.s,
      border: 'none',
    },
    separator: {
      width: '1px',
      height: euiTheme.size.xl,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      flexShrink: 0,
      alignSelf: 'stretch',
      position: 'relative' as const,
      '&::after': {
        content: '""',
        position: 'absolute' as const,
        top: '50%',
        left: '0',
        transform: 'translateY(-50%)',
        width: '1px',
        height: '16px',
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    },
    searchWrapper: css`
      background: ${euiTheme.colors.backgroundBasePlain};
      justify-content: center;
      border-bottom-right-radius: ${euiTheme.size.s};
      border-top-right-radius: ${euiTheme.size.s};
      padding-right: 2px;

      .euiFormControlLayout--group {
        border-radius: ${euiTheme.size.s};
      }
      .euiFormControlLayout--group::after {
        border: none;
      }

      .euiFormControlLayout__append {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        &::before {
          border: none;
        }
      }

      .kbnQueryBar__textarea {
        border-radius: ${euiTheme.size.s} !important;
        box-shadow: none;
        &:focus,
        &:hover {
          box-shadow: none !important;
          outline: none !important;
        }
      }
    `,
    searchFieldStyles: css`
      box-shadow: none;
      border-radius: 0;
      &:focus,
      &:hover {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
  };
};
