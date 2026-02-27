/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { useMemo } from 'react';
import type { AiButtonVariant } from './types';
import type {
  AiButtonGradientOptions,
  AiButtonGradientStyles,
  AiGradientColors,
  ResolvedVariantStyles,
  SvgAiGradient,
} from './gradient_types';

const diagonalGradientStartPercent = 2.98;
const diagonalGradientEndPercent = 66.24;
const diagonalGradientAngle = 130;
const horizontalGradientAngle = 90;
const verticalGradientAngle = 180;
const angleBoost = 35;

const linearGradientCss = ({
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

const buildLinearGradient = (
  colors: AiGradientColors,
  {
    angle = diagonalGradientAngle,
    startPercent = diagonalGradientStartPercent,
    endPercent = diagonalGradientEndPercent,
  }: { angle?: number; startPercent?: number; endPercent?: number } = {}
): string =>
  linearGradientCss({
    angle,
    startColor: colors.startColor,
    startPercent,
    endColor: colors.endColor,
    endPercent,
  });

const resolveGradientAngle = ({
  iconOnly,
  variant,
}: Pick<AiButtonGradientOptions, 'iconOnly' | 'variant'>): number => {
  if (iconOnly) {
    return diagonalGradientAngle;
  }

  if (variant === 'base') {
    return horizontalGradientAngle;
  }

  return diagonalGradientAngle + angleBoost;
};

const getLabelColors = (colors: UseEuiTheme['euiTheme']['colors']): AiGradientColors => ({
  startColor: colors.textPrimary,
  endColor: colors.textAssistance,
});

const gradientLabelCss = (cssGradient: string, hoverGradient?: string) => css`
  display: inline-block;
  background: ${cssGradient} !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;

  ${hoverGradient
    ? `button:hover:not(:disabled) &,
      button:focus-visible:not(:disabled) & {
        background: ${hoverGradient} !important;
        background-clip: text !important;
        -webkit-background-clip: text !important;
      }`
    : ''}
`;

const plainLabelCss = (color: string) => css`
  background: none !important;
  background-clip: initial !important;
  -webkit-background-clip: initial !important;
  color: ${color} !important;
  -webkit-text-fill-color: currentColor !important;
`;

// Uses ::after so it doesn't collide with EUI's ::before interaction overlay.
const outlinedBorderGradientCss = (borderGradient: string) => css`
  position: relative;
  border: none;
  isolation: isolate;

  &::after {
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

const resolveVariantStyles = (
  variant: AiButtonVariant,
  euiTheme: UseEuiTheme['euiTheme'],
  buttonGradientAngle: number
): ResolvedVariantStyles => {
  const {
    colors,
    components: {
      buttons: {
        backgroundPrimaryHover: hoverOverlayStartColor,
        backgroundAssistanceHover: hoverOverlayEndColor,
      },
    },
  } = euiTheme;
  const labelGradient = buildLinearGradient(getLabelColors(colors));

  const hoverOverlay = linearGradientCss({
    angle: verticalGradientAngle,
    startColor: hoverOverlayStartColor,
    startPercent: 18,
    endColor: hoverOverlayEndColor,
    endPercent: 83,
  });

  switch (variant) {
    case 'empty':
      return {
        buttonBackground: 'transparent',
        hoverBackground: hoverOverlay,
        labelColor: colors.textPrimary,
        labelCss: gradientLabelCss(labelGradient),
      };

    case 'outlined':
      return {
        buttonBackground: 'transparent',
        hoverBackground: hoverOverlay,
        borderGradient: buildLinearGradient(
          {
            startColor: colors.backgroundFilledPrimary,
            endColor: colors.backgroundFilledAssistance,
          },
          {
            angle: buttonGradientAngle,
            startPercent: diagonalGradientStartPercent,
            endPercent: diagonalGradientEndPercent,
          }
        ),
        labelColor: colors.textPrimary,
        labelCss: gradientLabelCss(labelGradient),
      };

    case 'accent': {
      const accentBg = buildLinearGradient(
        {
          startColor: colors.backgroundFilledPrimary,
          endColor: colors.backgroundFilledAssistance,
        },
        {
          angle: buttonGradientAngle,
          startPercent: diagonalGradientStartPercent,
          endPercent: diagonalGradientEndPercent,
        }
      );

      return {
        buttonBackground: accentBg,
        hoverBackground: `${hoverOverlay}, ${accentBg}`,
        labelColor: colors.textInverse,
        labelCss: plainLabelCss(colors.textInverse),
      };
    }

    case 'base': {
      const baseBg = buildLinearGradient(
        {
          startColor: colors.backgroundLightPrimary,
          endColor: colors.backgroundLightAssistance,
        },
        { angle: buttonGradientAngle }
      );

      return {
        buttonBackground: baseBg,
        hoverBackground: `${hoverOverlay}, ${baseBg}`,
        labelColor: colors.textPrimary,
        labelCss: gradientLabelCss(labelGradient, `${hoverOverlay}, ${labelGradient}`),
      };
    }
  }
};

export const useAiButtonGradientStyles = ({
  variant = 'base',
  iconOnly,
}: AiButtonGradientOptions = {}): AiButtonGradientStyles => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const buttonGradientAngle = resolveGradientAngle({ iconOnly, variant });
    const { buttonBackground, hoverBackground, borderGradient, labelColor, labelCss } =
      resolveVariantStyles(variant, euiTheme, buttonGradientAngle);

    const buttonCss = css`
      background: ${buttonBackground} !important;
      border-radius: ${euiTheme.border.radius.medium};
      color: ${labelColor} !important;
      ${borderGradient ? outlinedBorderGradientCss(borderGradient) : ''}

      &:hover:not(:disabled),
      &:focus-visible:not(:disabled) {
        background: ${hoverBackground} !important;
        /* EUI applies hover/active via an opaque ::before overlay
           (euiButtonInteractionStyles in global_styling/mixins/_button).
           Neutralising it so our custom gradient background is visible. */
        &::before {
          background-color: transparent !important;
        }
      }
      &:disabled {
        opacity: 0.5;
      }
    `;

    return { buttonCss, labelCss };
  }, [variant, iconOnly, euiTheme]);
};

export const useSvgAiGradient = ({ variant }: AiButtonGradientOptions = {}): SvgAiGradient => {
  const { euiTheme } = useEuiTheme();
  const gradientId = useGeneratedHtmlId({ prefix: 'kbnAiButtonIconGradient' });

  return useMemo(() => {
    const gradientUrl = `url(#${gradientId})`;
    const useIconGradient = variant !== 'accent';

    const iconGradientCss = useIconGradient
      ? css`
          & .euiIcon,
          & .euiIcon [fill]:not([fill='none']) {
            fill: ${gradientUrl} !important;
          }
          & .euiIcon [stroke]:not([stroke='none']) {
            stroke: ${gradientUrl} !important;
          }
        `
      : undefined;

    const labelColors = getLabelColors(euiTheme.colors);

    return {
      iconGradientCss,
      gradientId,
      colors: labelColors,
    };
  }, [gradientId, variant, euiTheme]);
};
