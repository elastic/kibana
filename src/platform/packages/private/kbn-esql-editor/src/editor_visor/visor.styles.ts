/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EuiThemeComputed } from '@elastic/eui';
import { euiFontSizeFromScale } from '@elastic/eui';
import { css } from '@emotion/react';
import { VisorMode } from './mode_selector';

export const visorWidthPercentage = 0.5;
export const dropdownWidthPercentage = 0.35;
export const MODE_SELECT_WIDTH_KQL = 80;
export const MODE_SELECT_WIDTH_NL = 160;
// Cap the expanded NL textarea height to roughly a third of the viewport,
// offset by 100px to leave room for the editor chrome above and below.
// Matches the max-height used by the KQL QueryStringInput textarea.
export const NL_TEXTAREA_MAX_HEIGHT = 'calc(35vh - 100px)';

export const visorStyles = (
  euiTheme: EuiThemeComputed,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isVisible: boolean,
  isDarkMode: boolean,
  mode: VisorMode,
  isNlToEsqlEnabled: boolean = false
) => {
  const fontSize = euiFontSizeFromScale('xs', euiTheme);
  const modeSelectWidth = mode === VisorMode.KQL ? MODE_SELECT_WIDTH_KQL : MODE_SELECT_WIDTH_NL;
  const visorBoxShadow = isDarkMode
    ? '0px 6px 14px 0px rgba(137, 157, 170, 0.2)'
    : '0px 6px 14px 0px rgba(11, 14, 22, 0.05)';
  const visorInnerPadding = '2px';

  const boxStyles = {
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.small,
    boxShadow: visorBoxShadow,
  };

  return {
    visorContainer: {
      position: 'absolute' as const,
      bottom: euiTheme.size.s,
      left: '50%',
      transform: isVisible
        ? 'translateX(-50%) translateY(0)'
        : 'translateX(-50%) translateY(8px)',
      zIndex: 5,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      width: isSpaceReduced ? '98%' : `calc(${visorWidthPercentage * 100}%)`,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    },
    visorWrapper: {
      width: `calc(100% - ${euiTheme.size.xl})`,
    },
    visorGradientBox: {
      ...boxStyles,
    },
    comboBoxWrapper: {
      background: euiTheme.colors.backgroundBasePlain,
      justifyContent: 'center',
      paddingLeft: visorInnerPadding,
      flexGrow: 1,
      maxWidth: `${
        isSpaceReduced ? `calc(${visorWidthPercentage * 100}% )` : `${comboBoxWidth}px`
      }`,
      overflow: 'hidden',
      ...(!isNlToEsqlEnabled && {
        borderBottomLeftRadius: euiTheme.border.radius.small,
        borderTopLeftRadius: euiTheme.border.radius.small,
      }),
    },
    closeButtonWrapper: {
      ...boxStyles,
      marginLeft: euiTheme.size.xs,
    },
    closeButton: {
      borderRadius: euiTheme.border.radius.small,
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
        height: euiTheme.size.base,
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    },
    searchWrapper: css`
      background: ${euiTheme.colors.backgroundBasePlain};
      justify-content: center;
      border-bottom-right-radius: ${euiTheme.border.radius.small};
      border-top-right-radius: ${euiTheme.border.radius.small};
      padding-right: ${visorInnerPadding};

      .euiFormControlLayout--group {
        border-radius: ${euiTheme.border.radius.small};
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
        border-radius: ${euiTheme.border.radius.small} !important;
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
    modeSelectWrapper: css`
      background: ${euiTheme.colors.backgroundBasePlain};
      border-bottom-left-radius: ${euiTheme.border.radius.small};
      border-top-left-radius: ${euiTheme.border.radius.small};
      padding-left: ${visorInnerPadding};
      flex-shrink: 0;
      flex-grow: 0;
      width: ${modeSelectWidth}px;
      transition: width ${euiTheme.animation.slow} ease-in-out;

      .euiComboBox__inputWrap {
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        background: transparent !important;
        font-size: ${fontSize} !important;
        &:hover,
        &:focus,
        &:focus-within,
        &:focus-visible {
          box-shadow: none !important;
          outline: none !important;
        }
      }
      .euiComboBox__input {
        font-size: ${fontSize} !important;
      }
    `,
    nlInputWrapper: css`
      background: ${euiTheme.colors.backgroundBasePlain};
      height: ${euiTheme.size.xl};
      border-bottom-right-radius: ${euiTheme.border.radius.small};
      border-top-right-radius: ${euiTheme.border.radius.small};
      padding-right: ${visorInnerPadding};
      overflow: visible;
      position: relative;
    `,
    nlInput: css`
      box-shadow: none !important;
      border: none !important;
      background-color: ${euiTheme.colors.backgroundBasePlain};
      font-size: ${fontSize} !important;
      padding: calc(${euiTheme.size.xs} + ${visorInnerPadding}) ${euiTheme.size.s} !important;
      margin: 0;
      resize: none;
      overflow: hidden;
      min-height: ${euiTheme.size.xl};
      border-radius: ${euiTheme.border.radius.small} !important;
      position: relative;
      z-index: ${euiTheme.levels.flyout};
      &:focus,
      &:hover {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
    searchFieldStyles: css`
      box-shadow: none;
      border-radius: 0;
      font-size: ${fontSize} !important;
      &:focus,
      &:hover {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
  };
};
