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

// NOTE: These values were originally introduced in Security Solution's
// `entity_highlights_gradients.tsx` while EUI does not yet provide reusable AI gradients.
// Keep them local to this component so Storybook can be used to iterate independently.
const gradientStartPercent = 2.98;
const gradientEndPercent = 66.24;

const buttonGradientAngle = 150;
const buttonGradientStartPercent = 3.97;
const buttonGradientEndPercent = 65.6;

const buttonTextGradientAngle = 170;

const gradients = {
  buttonBackground: {
    angle: buttonGradientAngle,
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

// TEMP: design iteration shades for dark-mode secondary background.
// These will be replaced with tokens once EUI exposes AI button gradient tokens.
const darkModeSecondaryBackgroundColors = {
  startColor: '#61A2FF',
  endColor: '#C5A5FA',
} as const;

// TEMP: design iteration shades for dark-mode primary background.
const darkModePrimaryBackgroundColors = {
  startColor: '#0D2F5E',
  endColor: '#3E2C63',
} as const;

const darkModeSecondaryForegroundColor = '#07101F';

// TEMP: design iteration shades for light-mode primary background.
const lightModePrimaryBackgroundColors = {
  startColor: '#0B64DD',
  endColor: '#8144CC',
} as const;

const lightModePrimaryForegroundColor = '#FFFFFF';

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

export interface AiButtonGradientStyleOptions {
  readonly fill?: boolean;
  /**
   * When provided, variant-specific gradient behavior can be applied.
   * This is optional to keep backwards compatibility with existing `fill` callers.
   */
  readonly variant?: 'primary' | 'secondary' | 'empty';
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

type AiButtonVariant = NonNullable<AiButtonGradientStyleOptions['variant']>;

interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}

const makeButtonBackgroundGradient = (colors: AiGradientColors) =>
  makeLinearGradient({
    angle: gradients.buttonBackground.angle,
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
  if (isDarkMode && (variant === 'primary' || variant === 'empty')) {
    return darkModeSecondaryBackgroundColors;
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

export const useAiButtonGradientStyles = ({
  fill,
  variant,
}: AiButtonGradientStyleOptions = {}): AiButtonGradientStyles => {
  const isDarkMode = useKibanaIsDarkMode();

  return useMemo(() => {
    const resolvedVariant = (variant ?? (fill ? 'primary' : 'secondary')) as AiButtonVariant;

    let buttonBackground: string;
    if (resolvedVariant === 'empty') {
      buttonBackground = isDarkMode ? '#000' : '#FFFFFF';
    } else if (resolvedVariant === 'primary') {
      buttonBackground = makeButtonBackgroundGradient(
        isDarkMode ? darkModePrimaryBackgroundColors : lightModePrimaryBackgroundColors
      );
    } else {
      // secondary
      buttonBackground = makeButtonBackgroundGradient(
        isDarkMode ? darkModeSecondaryBackgroundColors : gradients.buttonBackground.lightMode
      );
    }

    let buttonForegroundColor: string | undefined;
    if (!isDarkMode && resolvedVariant === 'primary') {
      buttonForegroundColor = lightModePrimaryForegroundColor;
    } else if (isDarkMode && resolvedVariant === 'secondary') {
      buttonForegroundColor = darkModeSecondaryForegroundColor;
    }

    const buttonCss = css`
      background: ${buttonBackground} !important;
      border-radius: 4px;
      ${buttonForegroundColor ? `color: ${buttonForegroundColor} !important;` : ''}

      &:hover:not(:disabled) {
        background: ${buttonBackground} !important; // update to hover color
      }
      &:focus:not(:disabled) {
        background: ${buttonBackground} !important;
      }
      &:disabled {
        opacity: 0.5;
      }
    `;

    let labelCss: SerializedStyles;
    if (isDarkMode && resolvedVariant === 'secondary') {
      labelCss = solidTextCss(darkModeSecondaryForegroundColor);
    } else if (!isDarkMode && resolvedVariant === 'primary') {
      labelCss = css`
        color: ${lightModePrimaryForegroundColor};
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
  }, [fill, isDarkMode, variant]);
};

export interface SvgAiGradient {
  /**
   * Emotion CSS that applies the gradient to EUI icons (`.euiIcon`) via `fill/stroke`.
   */
  readonly iconGradientCss?: SerializedStyles;
  /**
   * The generated gradient id (mainly for debugging).
   */
  readonly gradientId: string; // not sure if this is needed
  /**
   * The gradient stops used by the defs component.
   */
  readonly stops: AiGradientStopsDefinition;
}

export interface SvgAiGradientOptions {
  /**
   * When true, icons should inherit the button's foreground color (e.g. `textInverse`)
   * instead of rendering as a gradient.
   */
  readonly isFilled?: boolean;
  /**
   * When provided, variant-specific gradient behavior can be applied.
   */
  readonly variant?: 'primary' | 'secondary' | 'empty';
}

export const useSvgAiGradient = ({
  isFilled,
  variant,
}: SvgAiGradientOptions = {}): SvgAiGradient => {
  const isDarkMode = useKibanaIsDarkMode();

  const gradientId = useGeneratedHtmlId({ prefix: 'kbnAiButtonIconGradient' });
  const gradientUrl = `url(#${gradientId})`;

  const iconGradientCss = useMemo(() => {
    // Backwards compatible default: filled buttons don't use gradient icons unless a variant is provided.
    if (variant == null && isFilled) return undefined;
    // Dark mode secondary should be a solid foreground color.
    if (variant === 'secondary' && isDarkMode) return undefined;
    // Keep light mode primary icons as solid (existing behavior); apply gradient in dark mode.
    if (variant === 'primary' && isFilled && !isDarkMode) return undefined;
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
