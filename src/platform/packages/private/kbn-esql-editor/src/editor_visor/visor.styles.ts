/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { UseEuiTheme } from '@elastic/eui';
import { euiCanAnimate, euiFontSizeFromScale } from '@elastic/eui';
import { css } from '@emotion/react';

// Cap the expanded NL textarea height to roughly a third of the viewport,
// offset by 100px to leave room for the editor chrome above and below.
// Matches the max-height used by the KQL QueryStringInput textarea.
export const NL_TEXTAREA_MAX_HEIGHT = 'calc(35vh - 100px)';
const VISOR_INNER_PADDING = '2px';

export const visorStyles = (
  euiThemeContext: UseEuiTheme,
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
    searchWrapper: css`
      justify-content: center;
      position: relative;
      min-width: 0;

      .euiFormControlLayout--group {
        border-radius: ${borderRadius};
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
      }
    `,
    searchInner: css`
      width: 100%;
    `,
    submitButtonWrapper: css`
      padding-left: ${euiTheme.size.xs};
      flex-shrink: 0;
    `,
    modeToggleWrapper: css`
      padding-left: ${euiTheme.size.xs};
      flex-shrink: 0;
      display: flex;
      align-items: center;
    `,
    modeToggle: css`
      display: flex;
      align-items: center;
      gap: 0;
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
      border-radius: ${borderRadius};
      padding: ${euiTheme.size.xxs};
    `,
    kqlModeButton: css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: ${euiTheme.size.xl};
      min-block-size: ${euiTheme.size.xl};
      border-radius: ${euiTheme.border.radius.small};
    `,
    kqlModeButtonActive: css`
      background-color: ${euiTheme.colors.backgroundFilledText};

      .euiButtonIcon,
      .euiButtonIcon svg {
        color: ${euiTheme.colors.textInverse};
        fill: currentColor;
      }
    `,
    aiButtonSparkleHover: css`
      overflow: visible;

      @keyframes esqlVisorSparkleTwinkle {
        0%,
        8% {
          opacity: 1;
        }
        18%,
        38% {
          opacity: 0;
        }
        48%,
        100% {
          opacity: 1;
        }
      }

      ${euiCanAnimate} {
        &:hover svg path,
        &:focus-visible svg path {
          animation: esqlVisorSparkleTwinkle 1.1s ease-in-out infinite;
        }

        &:hover svg path:nth-of-type(2),
        &:focus-visible svg path:nth-of-type(2) {
          animation-delay: 0.28s;
        }

        &:hover svg path:nth-of-type(3),
        &:focus-visible svg path:nth-of-type(3) {
          animation-delay: 0.56s;
        }
      }
    `,
    nlInputWrapper: css`
      justify-content: center;
      min-width: 0;
    `,
    nlInput: css`
      font-size: ${fontSize};
    `,
  };
};
