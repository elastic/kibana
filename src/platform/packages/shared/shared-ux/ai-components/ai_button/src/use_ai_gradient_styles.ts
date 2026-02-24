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

const diagonalGradientStartPercent = 2.98;
const diagonalGradientEndPercent = 66.24;
const verticalGradientStartPercent = 3.97;
const verticalGradientEndPercent = 65.6;
const diagonalButtonGradientAngle = 130;
const verticalButtonGradientAngle = 99;

// TEMP: Figma design-token colors — will be replaced once EUI exposes AI gradient tokens.
const themeColors = {
  light: {
    plain: '#FFFFFF',
    background: { startColor: '#D9E8FF', endColor: '#ECE2FE' },
    hover: {
      overlay: { startColor: 'rgba(55, 136, 255, 0.12)', endColor: 'rgba(163, 110, 239, 0.12)' },
      background: { startColor: '#E8F1FF', endColor: '#F3ECFE' },
    },
    filled: { startColor: '#0B64DD', endColor: '#8144CC' },
    text: { startColor: '#1750BA', endColor: '#6B3C9F' },
  },
  dark: {
    plain: '#07101F',
    background: { startColor: '#0D2F5E', endColor: '#3E2C63' },
    filled: { startColor: '#61A2FF', endColor: '#C5A5FA' },
    text: { startColor: '#61A2FF', endColor: '#C5A5FA' },
  },
} as const;

// Base icon gradient stops from Figma SVG (offsets are 0..1, converted to percent here).
const baseIconStopOffsetPercent = {
  start: 16.8292,
  end: 83,
} as const;

const baseIconGradientGeometry = {
  gradientUnits: 'userSpaceOnUse' as const,
  x1: '-0.53125',
  y1: '-2.5',
  x2: '15.3422',
  y2: '9.5049',
} as const;

const gradients = {
  buttonBackground: {
    diagonalAngle: diagonalButtonGradientAngle,
    verticalAngle: verticalButtonGradientAngle,
    // Base background uses 3.97% -> 65.6% stops (Figma Inspect).
    startPercent: verticalGradientStartPercent,
    endPercent: verticalGradientEndPercent,
    lightMode: themeColors.light.background,
    darkMode: themeColors.dark.background,
  },
  foreground: {
    angle: diagonalButtonGradientAngle,
    startPercent: diagonalGradientStartPercent,
    endPercent: diagonalGradientEndPercent,
    lightMode: themeColors.light.text,
    darkMode: themeColors.dark.text,
  },
} as const;

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

interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}
export interface AiGradientStopsDefinition extends AiGradientColors {
  readonly startOffsetPercent: number;
  readonly endOffsetPercent: number;
}

const makeButtonBackgroundGradient = ({
  colors,
  angle,
  startPercent,
  endPercent,
}: {
  colors: AiGradientColors;
  angle: number;
  startPercent?: number;
  endPercent?: number;
}) =>
  makeLinearGradient({
    angle,
    startColor: colors.startColor,
    startPercent: startPercent ?? gradients.buttonBackground.startPercent,
    endColor: colors.endColor,
    endPercent: endPercent ?? gradients.buttonBackground.endPercent,
  });

const makeForegroundGradient = (colors: AiGradientColors) =>
  makeLinearGradient({
    angle: gradients.foreground.angle,
    startColor: colors.startColor,
    startPercent: gradients.foreground.startPercent,
    endColor: colors.endColor,
    endPercent: gradients.foreground.endPercent,
  });

const makeForegroundStops = (
  colors: AiGradientColors,
  {
    startOffsetPercent = gradients.foreground.startPercent,
    endOffsetPercent = gradients.foreground.endPercent,
  }: {
    startOffsetPercent?: number;
    endOffsetPercent?: number;
  } = {}
): AiGradientStopsDefinition => ({
  startColor: colors.startColor,
  endColor: colors.endColor,
  startOffsetPercent,
  endOffsetPercent,
});

const getForegroundColors = ({
  isDarkMode,
  variant,
}: {
  isDarkMode: boolean;
  variant?: AiButtonVariant;
}): AiGradientColors => {
  if (!isDarkMode && (variant === 'base' || variant === 'empty' || variant === 'outlined')) {
    return gradients.foreground.lightMode;
  }

  if (isDarkMode && (variant === 'accent' || variant === 'empty' || variant === 'outlined')) {
    return themeColors.dark.text;
  }

  return isDarkMode ? gradients.foreground.darkMode : gradients.foreground.lightMode;
};

const gradientTextCss = (cssGradient: string, hoverGradient?: string) => css`
  display: inline-block;
  background: ${cssGradient} !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;

  ${hoverGradient
    ? `button:hover:not(:disabled) & {
        background: ${hoverGradient} !important;
        background-clip: text !important;
        -webkit-background-clip: text !important;
      }`
    : ''}
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

interface ResolvedVariantStyles {
  readonly buttonBackground: string;
  readonly hoverBackground?: string;
  readonly borderGradient?: string;
  readonly foregroundColor?: string;
  readonly labelCss: SerializedStyles;
}

const resolveVariantStyles = (
  variant: AiButtonVariant,
  isDarkMode: boolean
): ResolvedVariantStyles => {
  const theme = isDarkMode ? themeColors.dark : themeColors.light;
  const foregroundGradient = makeForegroundGradient(getForegroundColors({ isDarkMode, variant }));

  const hoverOverlay = !isDarkMode
    ? makeLinearGradient({
        angle: 180,
        startColor: themeColors.light.hover.overlay.startColor,
        startPercent: 18,
        endColor: themeColors.light.hover.overlay.endColor,
        endPercent: 83,
      })
    : undefined;

  const baseHoverBg = hoverOverlay
    ? `${hoverOverlay}, ${makeLinearGradient({
        angle: 98,
        startColor: themeColors.light.hover.background.startColor,
        startPercent: 17,
        endColor: themeColors.light.hover.background.endColor,
        endPercent: 83,
      })}`
    : undefined;

  switch (variant) {
    case 'empty':
      return {
        buttonBackground: 'transparent',
        hoverBackground: baseHoverBg,
        foregroundColor: isDarkMode ? undefined : theme.text.startColor,
        labelCss: gradientTextCss(foregroundGradient),
      };

    case 'outlined':
      return {
        buttonBackground: 'transparent',
        hoverBackground: baseHoverBg,
        borderGradient: makeButtonBackgroundGradient({
          colors: isDarkMode ? gradients.foreground.darkMode : themeColors.light.filled,
          angle: gradients.buttonBackground.diagonalAngle,
          startPercent: diagonalGradientStartPercent,
          endPercent: diagonalGradientEndPercent,
        }),
        foregroundColor: isDarkMode ? undefined : theme.text.startColor,
        labelCss: gradientTextCss(foregroundGradient),
      };

    case 'accent': {
      const accentBg = makeButtonBackgroundGradient({
        colors: isDarkMode ? themeColors.dark.filled : themeColors.light.filled,
        angle: gradients.buttonBackground.diagonalAngle,
        startPercent: isDarkMode ? undefined : diagonalGradientStartPercent,
        endPercent: isDarkMode ? undefined : diagonalGradientEndPercent,
      });

      return {
        buttonBackground: accentBg,
        hoverBackground: !isDarkMode
          ? `${makeLinearGradient({
              angle: 180,
              startColor: themeColors.light.hover.overlay.startColor,
              startPercent: 17,
              endColor: themeColors.light.hover.overlay.endColor,
              endPercent: 83,
            })}, ${accentBg}`
          : undefined,
        foregroundColor: theme.plain,
        labelCss: isDarkMode
          ? solidTextCss(theme.plain)
          : css`
              color: ${theme.plain};
            `,
      };
    }

    case 'base':
      return {
        buttonBackground: makeButtonBackgroundGradient({
          colors: isDarkMode
            ? gradients.buttonBackground.darkMode
            : gradients.buttonBackground.lightMode,
          angle: verticalButtonGradientAngle,
        }),
        hoverBackground: baseHoverBg,
        foregroundColor: isDarkMode ? undefined : theme.text.startColor,
        labelCss: gradientTextCss(
          foregroundGradient,
          hoverOverlay ? `${hoverOverlay}, ${foregroundGradient}` : undefined
        ),
      };
  }
};

export const useAiButtonGradientStyles = ({
  isFilled,
  variant,
}: AiButtonGradientOptions = {}): AiButtonGradientStyles => {
  const isDarkMode = useKibanaIsDarkMode();

  return useMemo(() => {
    const resolvedVariant = (variant ?? (isFilled ? 'accent' : 'base')) as AiButtonVariant;
    const { buttonBackground, hoverBackground, borderGradient, foregroundColor, labelCss } =
      resolveVariantStyles(resolvedVariant, isDarkMode);

    const buttonCss = css`
      background: ${buttonBackground} !important;
      border-radius: 4px;
      ${foregroundColor ? `color: ${foregroundColor} !important;` : ''}
      ${borderGradient ? outlinedBorderRingCss(borderGradient) : ''}

      &:hover:not(:disabled) {
        ${hoverBackground ? `background: ${hoverBackground} !important;` : ''}
        /* EUI applies hover via an opaque ::before overlay (see _interactionStyles in _button.js),
           which covers our gradient background. Hide it so our custom hover gradient is visible. */
        &::before {
          display: none;
        }
      }
      &:focus:not(:disabled) {
        ${hoverBackground ? `background: ${hoverBackground} !important;` : ''}
        outline: none !important;
        box-shadow: 0 0 0 1px #0a2342, 0 0 0 3px #ffffff !important;
      }
      &:disabled {
        opacity: 0.5;
      }
    `;

    return { buttonCss, labelCss };
  }, [isFilled, isDarkMode, variant]);
};

export interface SvgAiGradient {
  /**
   * Emotion CSS that applies the gradient to EUI icons (`.euiIcon`) via `fill/stroke`.
   */
  readonly iconGradientCss?: SerializedStyles;
  /**
   * Optional geometry overrides for the rendered SVG <linearGradient>.
   * Used when Figma specifies user-space coordinates for the icon gradient.
   */
  readonly defs?: {
    readonly gradientUnits?: 'objectBoundingBox' | 'userSpaceOnUse';
    readonly x1?: string;
    readonly y1?: string;
    readonly x2?: string;
    readonly y2?: string;
  };
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

  return useMemo(() => {
    const gradientUrl = `url(#${gradientId})`;
    const useBaseIconGradient = variant === 'base' || variant === 'empty' || variant === 'outlined';

    const shouldShowIconGradient =
      variant !== 'accent' && (isDarkMode || useBaseIconGradient) && !(variant == null && isFilled);

    const iconGradientCss = shouldShowIconGradient
      ? css`
          & .euiIcon {
            fill: ${gradientUrl} !important;
          }
          & .euiIcon [fill]:not([fill='none']) {
            fill: ${gradientUrl} !important;
          }
          & .euiIcon [stroke]:not([stroke='none']) {
            stroke: ${gradientUrl} !important;
          }
        `
      : undefined;

    const foregroundColors = getForegroundColors({ isDarkMode, variant });
    const foregroundStops = useBaseIconGradient
      ? makeForegroundStops(foregroundColors, {
          startOffsetPercent: baseIconStopOffsetPercent.start,
          endOffsetPercent: baseIconStopOffsetPercent.end,
        })
      : makeForegroundStops(foregroundColors);

    return {
      iconGradientCss,
      gradientId,
      defs: useBaseIconGradient ? baseIconGradientGeometry : undefined,
      stops: foregroundStops,
    };
  }, [gradientId, isDarkMode, isFilled, variant]);
};
