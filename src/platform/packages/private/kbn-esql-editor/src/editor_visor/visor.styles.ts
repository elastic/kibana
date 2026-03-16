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
import { VisorMode } from './mode_selector';

export const visorWidthPercentage = 0.5;
export const dropdownWidthPercentage = 0.35;
export const MODE_SELECT_WIDTH_KQL = 80;
export const MODE_SELECT_WIDTH_NL = 160;
const VISOR_INNER_PADDING = '2px';
// Cap the expanded NL textarea height to roughly a third of the viewport,
// offset by 100px to leave room for the editor chrome above and below.
// Matches the max-height used by the KQL QueryStringInput textarea.
export const NL_TEXTAREA_MAX_HEIGHT = 'calc(35vh - 100px)';

export const visorStyles = (
  euiThemeContext: UseEuiTheme,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isVisible: boolean,
  mode: VisorMode
) => {
  const { euiTheme } = euiThemeContext;
  const fontSize = euiFontSizeFromScale('xs', euiTheme);
  const modeSelectWidth = mode === VisorMode.KQL ? MODE_SELECT_WIDTH_KQL : MODE_SELECT_WIDTH_NL;
  const borderRadius = euiTheme.border.radius.medium;

  const boxStyles = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${borderRadius};
    ${euiShadow(euiThemeContext, 'xs')}
  `;

  return {
    visorContainer: css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      width: ${isSpaceReduced ? '98%' : `calc(${visorWidthPercentage * 100}%)`};
      margin: ${isVisible ? `0 auto ${euiTheme.size.base}` : '0 auto 0'};
      height: ${isVisible ? `calc(${euiTheme.size.xl} + ${VISOR_INNER_PADDING})` : '0'};
      opacity: ${isVisible ? 1 : 0};
      pointer-events: ${isVisible ? 'auto' : 'none'};
      transition: all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    `,
    visorWrapper: css`
      width: calc(100% - ${euiTheme.size.xl});
    `,
    visorBox: css`
      ${boxStyles}
    `,
    comboBoxWrapper: css`
      justify-content: center;
      padding-left: ${euiTheme.size.xs};
      flex-grow: 1;
      max-width: ${isSpaceReduced ? `calc(${visorWidthPercentage * 100}%)` : `${comboBoxWidth}px`};
      overflow: hidden;
    `,
    closeButtonWrapper: css`
      ${boxStyles}
      margin-left: ${euiTheme.size.xs};
    `,
    closeButton: css`
      border-radius: ${borderRadius};
      border: none;
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

      .euiFormControlLayout--group {
        border-radius: ${borderRadius};
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
        border-radius: ${borderRadius} !important;
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
      padding-left: ${euiTheme.size.xs};
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
      height: ${euiTheme.size.xl};
      padding-right: ${euiTheme.size.xs};
      overflow: visible;
      position: relative;
    `,
    nlInput: css`
      box-shadow: none !important;
      border: none !important;
      background-color: transparent;
      font-size: ${fontSize} !important;
      padding: calc(${euiTheme.size.xs} + ${VISOR_INNER_PADDING}) ${euiTheme.size.s} !important;
      margin: 0;
      resize: none;
      overflow: hidden;
      min-height: ${euiTheme.size.xl};
      border-radius: ${borderRadius} !important;
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
