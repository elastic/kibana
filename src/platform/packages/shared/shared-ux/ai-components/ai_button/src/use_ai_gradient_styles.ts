/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, type SerializedStyles } from '@emotion/react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { useMemo } from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { AiButtonVariant } from './types';

// Keep constants local to this file so Storybook can be used to iterate independently.
// Hard-coded values are used to avoid relying on EUI tokens that are not yet available.
const gradientStartPercent = 2.98;
const gradientEndPercent = 66.24;

const diagonalButtonGradientAngle = 150;
const verticalButtonGradientAngle = 90;
const buttonGradientStartPercent = 3.97;
const buttonGradientEndPercent = 65.6;

const buttonTextGradientAngle = 170;

const gradients = {
  buttonBackground: {
    diagonalAngle: diagonalButtonGradientAngle,
    verticalAngle: verticalButtonGradientAngle,
    startPercent: buttonGradientStartPercent,
    endPercent: buttonGradientEndPercent,
    lightMode: { startColor: '#D9E8FF', endColor: '#ECE2FE' },
    darkMode: { startColor: '#123A79', endColor: '#3B1D66' },
  },
  foreground: {
    angle: buttonTextGradientAngle,
    startPercent: gradientStartPercent,
    endPercent: gradientEndPercent,
    lightMode: { startColor: '#1750BA', endColor: '#6B3C9F' },
    darkMode: { startColor: '#D9E8FF', endColor: '#ECE2FE' },
  },
} as const;

// TEMP: design iteration shades for dark-mode base background.
// These will be replaced with tokens once EUI exposes AI button gradient tokens.
const darkModeBaseBackgroundColors = {
  startColor: '#61A2FF',
  endColor: '#C5A5FA',
} as const;

// TEMP: design iteration shades for dark-mode filled background.
const darkModeFilledBackgroundColors = {
  startColor: '#0D2F5E',
  endColor: '#3E2C63',
} as const;

const darkModeBaseForegroundColor = '#07101F';

// TEMP: design iteration shades for light-mode filled background.
const lightModeFilledBackgroundColors = {
  startColor: '#0B64DD',
  endColor: '#8144CC',
} as const;

const lightModeFilledForegroundColor = '#FFFFFF';

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

export interface AiButtonGradientOptions {
  readonly isFilled?: boolean;
  /**
   * When provided, variant-specific gradient behavior can be applied.
   * This is optional to keep backwards compatibility with existing `fill` callers.
   */
  readonly variant?: AiButtonVariant;
}

export interface AiButtonGradientStyles {
  readonly buttonCss: SerializedStyles;
  readonly labelCss: SerializedStyles;
}

export interface AiGradientStopsDefinition {
  readonly startColor: string;
  readonly endColor: string;
  readonly startOffsetPercent: number;
  readonly endOffsetPercent: number;
}

interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}

const makeButtonBackgroundGradient = ({
  colors,
  angle,
}: {
  colors: AiGradientColors;
  angle: number;
}) =>
  makeLinearGradient({
    angle,
    startColor: colors.startColor,
    startPercent: gradients.buttonBackground.startPercent,
    endColor: colors.endColor,
    endPercent: gradients.buttonBackground.endPercent,
  });

const makeForegroundGradient = (colors: AiGradientColors) =>
  makeLinearGradient({
    angle: gradients.foreground.angle,
    startColor: colors.startColor,
    startPercent: gradients.foreground.startPercent,
    endColor: colors.endColor,
    endPercent: gradients.foreground.endPercent,
  });

const makeForegroundStops = (colors: AiGradientColors): AiGradientStopsDefinition => ({
  startColor: colors.startColor,
  endColor: colors.endColor,
  startOffsetPercent: gradients.foreground.startPercent,
  endOffsetPercent: gradients.foreground.endPercent,
});

const getForegroundColors = ({
  isDarkMode,
  variant,
}: {
  isDarkMode: boolean;
  variant?: AiButtonVariant;
}): AiGradientColors => {
  if (isDarkMode && (variant === 'accent' || variant === 'empty' || variant === 'outlined')) {
    return darkModeBaseBackgroundColors;
  }

  return isDarkMode ? gradients.foreground.darkMode : gradients.foreground.lightMode;
};

const gradientTextCss = (cssGradient: string) => css`
  display: inline-block;
  background: ${cssGradient} !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
`;

const solidTextCss = (color: string) => css`
  background: none !important;
  background-clip: initial !important;
  -webkit-background-clip: initial !important;
  color: ${color} !important;
  -webkit-text-fill-color: currentColor !important;
`;

const outlinedBorderRingCss = (borderGradient: string) => css`
  position: relative;
  border: none;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: ${borderGradient};
    pointer-events: none;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
  }
`;

export const useAiButtonGradientStyles = ({
  isFilled,
  variant,
}: AiButtonGradientOptions = {}): AiButtonGradientStyles => {
  const isDarkMode = useKibanaIsDarkMode();

  return useMemo(() => {
    const resolvedVariant = (variant ?? (isFilled ? 'accent' : 'base')) as AiButtonVariant;

    const accentGradientColors = isDarkMode
      ? darkModeFilledBackgroundColors
      : lightModeFilledBackgroundColors;
    const accentBackgroundAngle = isDarkMode
      ? gradients.buttonBackground.verticalAngle
      : gradients.buttonBackground.diagonalAngle;
    const baseBackgroundAngle = isDarkMode
      ? gradients.buttonBackground.diagonalAngle
      : gradients.buttonBackground.verticalAngle;

    let outlinedBorderGradientCss: string | undefined;
    let buttonBackground: string;
    if (resolvedVariant === 'empty') {
      buttonBackground = 'transparent';
    } else if (resolvedVariant === 'outlined') {
      outlinedBorderGradientCss = makeButtonBackgroundGradient({
        colors: accentGradientColors,
        angle: accentBackgroundAngle,
      });
      buttonBackground = 'transparent';
    } else if (resolvedVariant === 'accent') {
      buttonBackground = makeButtonBackgroundGradient({
        colors: accentGradientColors,
        angle: accentBackgroundAngle,
      });
    } else {
      // base
      buttonBackground = makeButtonBackgroundGradient({
        colors: isDarkMode ? darkModeBaseBackgroundColors : gradients.buttonBackground.lightMode,
        angle: baseBackgroundAngle,
      });
    }
    let buttonForegroundColor: string | undefined;
    if (!isDarkMode && resolvedVariant === 'accent') {
      buttonForegroundColor = lightModeFilledForegroundColor;
    } else if (isDarkMode && resolvedVariant === 'base') {
      buttonForegroundColor = darkModeBaseForegroundColor;
    }

    const buttonCss = css`
      background: ${buttonBackground} !important;
      border-radius: 4px;
      ${buttonForegroundColor ? `color: ${buttonForegroundColor} !important;` : ''}
      ${outlinedBorderGradientCss ? outlinedBorderRingCss(outlinedBorderGradientCss) : ''}

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

    let labelCss: SerializedStyles;
    if (isDarkMode && resolvedVariant === 'base') {
      labelCss = solidTextCss(darkModeBaseForegroundColor);
    } else if (!isDarkMode && resolvedVariant === 'accent') {
      labelCss = css`
        color: ${lightModeFilledForegroundColor};
      `;
    } else {
      labelCss = gradientTextCss(
        makeForegroundGradient(getForegroundColors({ isDarkMode, variant: resolvedVariant }))
      );
    }

    return {
      buttonCss,
      labelCss,
    };
  }, [isFilled, isDarkMode, variant]);
};

export interface SvgAiGradient {
  /**
   * Emotion CSS that applies the gradient to EUI icons (`.euiIcon`) via `fill/stroke`.
   */
  readonly iconGradientCss?: SerializedStyles;
  /**
   * The generated gradient id used by `SvgAiGradientDefs`.
   */
  readonly gradientId: string;
  /**
   * The gradient stops used by the defs component.
   */
  readonly stops: AiGradientStopsDefinition;
}
export const useSvgAiGradient = ({
  isFilled,
  variant,
}: AiButtonGradientOptions = {}): SvgAiGradient => {
  const isDarkMode = useKibanaIsDarkMode();

  const gradientId = useGeneratedHtmlId({ prefix: 'kbnAiButtonIconGradient' });
  const gradientUrl = `url(#${gradientId})`;

  const iconGradientCss = useMemo(() => {
    // Backwards compatible default: filled buttons don't use gradient icons unless a variant is provided.
    if (variant == null && isFilled) return undefined;
    // Dark mode base should be a solid foreground color.
    if (variant === 'base' && isDarkMode) return undefined;
    // Keep light mode filled icons as solid (existing behavior); apply gradient in dark mode.
    if (variant === 'accent' && isFilled && !isDarkMode) return undefined;
    return css`
      & .euiIcon {
        fill: ${gradientUrl} !important;
      }
      & .euiIcon [fill]:not([fill='none']) {
        fill: ${gradientUrl} !important;
      }
      & .euiIcon [stroke]:not([stroke='none']) {
        stroke: ${gradientUrl} !important;
      }
    `;
  }, [gradientUrl, isDarkMode, isFilled, variant]);

  const foregroundColors = getForegroundColors({ isDarkMode, variant });

  return {
    iconGradientCss,
    gradientId,
    stops: makeForegroundStops(foregroundColors),
  };
};
