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

export const visorStyles = (
  euiThemeContext: UseEuiTheme,
  isInline: boolean,
  isVisible: boolean = true
) => {
  const { euiTheme } = euiThemeContext;
  const fontSize = euiFontSizeFromScale('xs', euiTheme);

  return {
    visorContainer: css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      width: 100%;
      ${isInline
        ? `
          min-height: ${isVisible ? euiTheme.size.xl : '0'};
          height: ${isVisible ? 'auto' : '0'};
          max-height: ${isVisible ? NL_TEXTAREA_MAX_HEIGHT : '0'};
          opacity: ${isVisible ? 1 : 0};
          pointer-events: ${isVisible ? 'auto' : 'none'};
          overflow: ${isVisible ? 'visible' : 'hidden'};
          transition: min-height 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), max-height 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
        `
        : `min-height: ${euiTheme.size.xl};`}
    `,
    visorWrapper: css`
      width: 100%;
    `,
    searchWrapper: css`
      justify-content: center;
      position: relative;
      min-width: 0;

      .euiFormControlLayout--group {
        border-radius: ${euiTheme.border.radius.control};
      }

      .euiFormControlLayout__append {
        &::before {
          border: none;
        }
      }

      .kbnQueryBar__textarea {
        border-radius: ${euiTheme.border.radius.control} !important;
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
      position: relative;
      display: inline-flex;
      align-items: center;
      box-sizing: border-box;
      gap: ${euiTheme.size.xs};
      block-size: ${euiTheme.size.xl};
      max-block-size: ${euiTheme.size.xl};
      padding: ${euiTheme.size.xs};
      border-radius: ${euiTheme.border.radius.control};

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border};
        border-radius: inherit;
        pointer-events: none;
      }

      .euiButton,
      .euiButtonEmpty,
      .euiButtonIcon {
        border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
      }
    `,
    kqlModeButton: css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: ${euiTheme.size.l};
      block-size: ${euiTheme.size.l};
      border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});

      .euiButtonIcon {
        border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
        background-color: transparent;

        &:hover,
        &:focus,
        &:focus-visible {
          background-color: ${euiTheme.components.buttons.backgroundEmptyTextHover};
        }
      }
    `,
    kqlModeButtonActive: css`
      .euiButtonIcon,
      .euiButtonIcon:hover,
      .euiButtonIcon:focus,
      .euiButtonIcon:focus-visible {
        background-color: ${euiTheme.colors.backgroundLightText};
      }
    `,
    aiButtonSparkleHover: css`
      overflow: visible;
      box-sizing: border-box;
      block-size: ${euiTheme.size.l};
      max-block-size: ${euiTheme.size.l};

      /* The group already draws the border. Keep the outlined gradient on the icon and label. */
      &::after {
        content: none;
      }

      /* Starts at the resting icon so hover eases in instead of snapping to the dim frame. */
      @keyframes esqlVisorSparkleTwinkle {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.45;
          transform: scale(0.85);
        }
      }

      ${euiCanAnimate} {
        &:hover svg path,
        &:focus-visible svg path {
          transform-box: fill-box;
          transform-origin: center;
          animation-name: esqlVisorSparkleTwinkle;
          animation-duration: calc(${euiTheme.animation.extraSlow} * 2);
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        &:hover svg path:nth-of-type(2),
        &:focus-visible svg path:nth-of-type(2) {
          animation-delay: ${euiTheme.animation.slow};
        }

        &:hover svg path:nth-of-type(3),
        &:focus-visible svg path:nth-of-type(3) {
          animation-delay: ${euiTheme.animation.extraSlow};
        }
      }
    `,
    aiButtonSelected: css`
      /* Same gradient AiButton outlined uses on hover, so the selected fill stays visible at size xs. */
      background: linear-gradient(
        180deg,
        ${euiTheme.components.buttons.backgroundPrimaryHover} 18%,
        ${euiTheme.components.buttons.backgroundAssistanceHover} 83%
      ) !important;
    `,
    nlInputWrapper: css`
      justify-content: center;
      min-width: 0;
    `,
    nlInput: css`
      .euiTextArea {
        box-sizing: border-box;
        height: ${euiTheme.size.xl};
        min-height: ${euiTheme.size.xl};
        padding-block-start: ${euiTheme.size.xxs};
        padding-block-end: 0;
        padding-inline: ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.control};
        font-size: ${fontSize};
        line-height: calc(${euiTheme.size.xl} - (${euiTheme.border.width.thin} * 2));
        overflow: hidden;
      }
    `,
  };
};
