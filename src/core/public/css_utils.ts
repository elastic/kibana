/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file replaces scss core/public/_mixins.scss

import { css, keyframes } from '@emotion/react';
import { COLOR_MODES_STANDARD, UseEuiTheme, euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { CSSInterpolation } from '@emotion/serialize';
import bg_top_branded from './styles/core_app/images/bg_top_branded.svg';
import bg_top_branded_dark from './styles/core_app/images/bg_top_branded_dark.svg';
import bg_bottom_branded from './styles/core_app/images/bg_bottom_branded.svg';
import bg_bottom_branded_dark from './styles/core_app/images/bg_bottom_branded_dark.svg';

// The `--kbnAppHeadersOffset` CSS variable is automatically updated by
// styles/rendering/_base.scss, based on whether the Kibana chrome has a
// header banner, app menu, and is visible or hidden
export const kibanaFullBodyHeightCss = (additionalOffset = '0px') =>
  css({
    height: `calc(100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)) - ${additionalOffset})`,
  });

export const fullScreenGraphicsMixinStyles = (euiZLevel: number, euiTheme: UseEuiTheme) => {
  const lightOrDarkTheme = (lightSvg: any, darkSvg: any) => {
    return euiTheme.colorMode === COLOR_MODES_STANDARD.light ? lightSvg : darkSvg;
  };
  const fullScreenGraphicsFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;
  return css({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: euiZLevel + 1000,
    background: 'inherit',
    backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
    opacity: 0,
    overflow: 'auto',
    [euiCanAnimate]: {
      animation: `${fullScreenGraphicsFadeIn} ${euiTheme.euiTheme.animation.extraSlow} ${euiTheme.euiTheme.animation.resistance} 0s forwards`,
    },
    '.kbnBody--hasHeaderBanner &': {
      top: 'var(--kbnHeaderBannerHeight)',
    },
    '&::before': {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1,
      width: '400px',
      height: '400px',
      content: `url(${lightOrDarkTheme(bg_top_branded, bg_top_branded_dark)})`,
    },
    '&::after': {
      position: 'fixed',
      bottom: 0,
      right: 0,
      zIndex: 1,
      width: '400px',
      height: '400px',
      content: `url(${lightOrDarkTheme(bg_bottom_branded, bg_bottom_branded_dark)})`,
    },
    [`@media (max-width: ${euiTheme.euiTheme.breakpoint.l}px)`]: {
      '&::before, &::after': {
        content: 'none',
      },
    },
  });
};

export type EmotionStyles = Record<
  string,
  CSSInterpolation | ((theme: UseEuiTheme) => CSSInterpolation)
>;

type StaticEmotionStyles = Record<string, CSSInterpolation>;

/**
 * Custom hook to reduce boilerplate when working with Emotion styles that may depend on
 * the EUI theme.
 *
 * Accepts a map of styles where each entry is either a static Emotion style (via `css`)
 * or a function that returns styles based on the current `euiTheme`.
 *
 * It returns a memoized version of the style map with all values resolved to static
 * Emotion styles, allowing components to use a clean and unified object for styling.
 *
 * This helps simplify component code by centralizing theme-aware style logic.
 *
 * Example usage:
 *   const componentStyles = {
 *     container: css({ overflow: hidden }),
 *     leftPane: ({ euiTheme }) => css({ paddingTop: euiTheme.size.m }),
 *   }
 *   const styles = useMemoizedStyles(componentStyles);
 */
export const useMemoizedStyles = (styleMap: EmotionStyles) => {
  const euiThemeContext = useEuiTheme();
  const outputStyles = useMemo(() => {
    return Object.entries(styleMap).reduce<StaticEmotionStyles>((acc, [key, value]) => {
      acc[key] = typeof value === 'function' ? value(euiThemeContext) : value;
      return acc;
    }, {});
  }, [euiThemeContext, styleMap]);
  return outputStyles;
};
