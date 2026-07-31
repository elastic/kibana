/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSizeFromScale } from '@elastic/eui';
import { css } from '@emotion/react';

export const visorWidthPercentage = 0.5;
export const dropdownWidthPercentage = 0.35;
const INLINE_SOURCES_PICKER_WIDTH = 100;

// Cap the expanded NL textarea height to roughly a third of the viewport,
// offset by 100px to leave room for the editor chrome above and below.
// Matches the max-height used by the KQL QueryStringInput textarea.
export const NL_TEXTAREA_MAX_HEIGHT = 'calc(35vh - 100px)';
const VISOR_INNER_PADDING = '2px';

export const visorStyles = (
  euiThemeContext: UseEuiTheme,
  comboBoxWidth: number,
  isSpaceReduced: boolean,
  isInline: boolean,
  isVisible: boolean = true
) => {
  const { euiTheme } = euiThemeContext;
  const fontSize = euiFontSizeFromScale('xs', euiTheme);
  const borderRadius = euiTheme.border.radius.medium;

  return {
    visorContainer: css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      width: 100%;
      ${isInline
        ? `
          height: ${isVisible ? `calc(${euiTheme.size.xl} + ${VISOR_INNER_PADDING})` : '0'};
          opacity: ${isVisible ? 1 : 0};
          pointer-events: ${isVisible ? 'auto' : 'none'};
          overflow: hidden;
          transition: height 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
        `
        : `min-height: calc(${euiTheme.size.xl} + ${VISOR_INNER_PADDING});`}
    `,
    visorWrapper: css`
      width: 100%;
    `,
    visorBox: css`
      border: 1px solid ${euiTheme.colors.borderBaseSubdued};
      border-radius: ${borderRadius};
    `,
    comboBoxWrapper: css`
      justify-content: center;
      padding-left: ${euiTheme.size.xs};
      overflow: hidden;
      min-width: 0;
      ${isInline
        ? `
          flex: 0 0 ${INLINE_SOURCES_PICKER_WIDTH}px;
          width: ${INLINE_SOURCES_PICKER_WIDTH}px;
        `
        : `
          flex-grow: 1;
          max-width: ${
            isSpaceReduced ? `calc(${visorWidthPercentage * 100}%)` : `${comboBoxWidth}px`
          };
        `}
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
      min-width: 0;

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
    searchInner: css`
      width: 100%;
    `,
    submitButtonWrapper: css`
      padding-right: ${euiTheme.size.xs};
      padding-left: ${euiTheme.size.xs};
      flex-shrink: 0;
    `,
    aiBadgeWrapper: css`
      padding-left: ${euiTheme.size.xs};
      padding-right: ${euiTheme.size.s};
      flex-shrink: 0;
      display: flex;
      align-items: center;
      .euiBadge__icon {
        cursor: pointer;
      }
    `,
    nlInputWrapper: css`
      justify-content: center;
      padding-right: ${euiTheme.size.xs};
      min-width: 0;
    `,
    nlInput: css`
      font-size: ${fontSize};
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      background: transparent !important;
      &:hover,
      &:focus {
        box-shadow: none !important;
        outline: none !important;
      }
    `,
    nlFormControl: css`
      .euiFormControlLayout {
        box-shadow: none !important;
        background: transparent !important;
        &:hover,
        &:focus-within {
          outline: none !important;
          box-shadow: none !important;
        }
      }
      .euiFormControlLayout__childrenWrapper {
        background: transparent !important;
      }
    `,
  };
};
