/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, type SerializedStyles } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

// NOTE: These values were originally introduced in Security Solution's
// `entity_highlights_gradients.tsx` while EUI does not yet provide reusable AI gradients.
// Keep them local to this component so Storybook can be used to iterate independently.
const gradientStartPercent = 2.98;
const gradientEndPercent = 66.24;

const buttonGradientAngle = 99;
const buttonGradientStartPercent = 3.97;
const buttonGradientEndPercent = 65.6;

const buttonTextGradientAngle = 131;

const lightModeColors = {
  buttonGradient: `linear-gradient(${buttonGradientAngle}deg, #D9E8FF ${buttonGradientStartPercent}%, #ECE2FE ${buttonGradientEndPercent}%)`,
  buttonTextGradient: `linear-gradient(${buttonTextGradientAngle}deg, #1750ba ${gradientStartPercent}%, #8144cc ${gradientEndPercent}%)`,
};

const darkModeColors = {
  // TODO: AI generated gradients, replace with UX designed gradients when available.
  buttonGradient: `linear-gradient(${buttonGradientAngle}deg, #123A79 ${buttonGradientStartPercent}%, #3B1D66 ${buttonGradientEndPercent}%)`,
  buttonTextGradient: `linear-gradient(${buttonTextGradientAngle}deg, #D9E8FF ${gradientStartPercent}%, #ECE2FE ${gradientEndPercent}%)`,
};

const makeLinearGradient = ({
  angle,
  startColor,
  startPercent,
  endColor,
  endPercent,
}: {
  angle: number;
  startColor: string;
  startPercent: number;
  endColor: string;
  endPercent: number;
}) => `linear-gradient(${angle}deg, ${startColor} ${startPercent}%, ${endColor} ${endPercent}%)`;

const fallbackTokens = {
  filledButtonGradientStart: '#0B64DD',
  filledButtonGradientEnd: '#731DCF',
} as const;

const getAiButtonThemeTokens = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => {
  // TODO: Replace the token accessors once EUI exposes AI button gradient tokens.
  // These will be consumable similarly to `euiTheme.colors.vis.euiColorVis6`.
  const colors = euiTheme.colors as unknown as Record<string, unknown>;
  const aiUnknown = colors.ai;
  const ai =
    aiUnknown && typeof aiUnknown === 'object'
      ? (aiUnknown as Record<string, unknown>)
      : {};

  const filledButtonGradientStartValue = ai.filledButtonGradientStart;
  const filledButtonGradientEndValue = ai.filledButtonGradientEnd;

  return {
    filledButtonGradientStart:
      typeof filledButtonGradientStartValue === 'string'
        ? filledButtonGradientStartValue
        : fallbackTokens.filledButtonGradientStart,
    filledButtonGradientEnd:
      typeof filledButtonGradientEndValue === 'string'
        ? filledButtonGradientEndValue
        : fallbackTokens.filledButtonGradientEnd,
  };
};

export interface AiButtonGradientStyleOptions {
  readonly fill?: boolean;
  readonly empty?: boolean;
}

export interface AiButtonGradientStyles {
  readonly buttonCss: SerializedStyles;
  readonly labelCss: SerializedStyles;
}

export const useAiButtonGradientStyles = ({
  fill,
  empty = false,
}: AiButtonGradientStyleOptions = {}): AiButtonGradientStyles => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();

  return useMemo(() => {
    const colors = isDarkMode ? darkModeColors : lightModeColors;
    const themeTokens = getAiButtonThemeTokens(euiTheme);
    const isFilled = Boolean(fill) && !empty;

    const filledButtonGradient = makeLinearGradient({
      angle: buttonGradientAngle,
      startColor: themeTokens.filledButtonGradientStart,
      startPercent: buttonGradientStartPercent,
      endColor: themeTokens.filledButtonGradientEnd,
      endPercent: buttonGradientEndPercent,
    });

    let buttonBackground = colors.buttonGradient;
    if (isFilled) {
      buttonBackground = filledButtonGradient;
    } else if (empty) {
      buttonBackground = euiTheme.colors.emptyShade;
    }

    const buttonCss = css`
      background: ${buttonBackground} !important;
      border-radius: 4px;
      ${isFilled ? `color: ${euiTheme.colors.textInverse};` : ''}
      ${empty
        ? `
          box-shadow: none !important;
          border: ${euiTheme.border.width.thin} solid transparent;
          &:focus {
            outline: none;
          }
          &:focus-visible {
            outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
            outline-offset: -${euiTheme.focus.width};
          }
        `
        : ''}

      &:hover:not(:disabled) {
        background: ${buttonBackground} !important;
      }
      &:focus:not(:disabled) {
        background: ${buttonBackground} !important;
      }
      &:disabled {
        opacity: 0.5;
      }
    `;

    const labelCss = isFilled
      ? css`
          color: ${euiTheme.colors.textInverse};
        `
      : css`
          background: ${colors.buttonTextGradient};
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        `;

    return {
      buttonCss,
      labelCss,
    };
  }, [euiTheme, empty, fill, isDarkMode]);
};
