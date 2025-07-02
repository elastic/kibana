/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file replaces scss core/public/_mixins.scss

import { useMemo } from 'react';
import { css, keyframes } from '@emotion/react';
import { COLOR_MODES_STANDARD, UseEuiTheme, euiCanAnimate, useEuiTheme } from '@elastic/eui';
import bg_top_branded from './images/bg_top_branded.svg';
import bg_top_branded_dark from './images/bg_top_branded_dark.svg';
import bg_bottom_branded from './images/bg_bottom_branded.svg';
import bg_bottom_branded_dark from './images/bg_bottom_branded_dark.svg';

export const kbnFullScreenBgCss = ({ euiTheme, colorMode }: UseEuiTheme) => {
  const lightOrDarkTheme = (lightSvg: string, darkSvg: any) => {
    return colorMode === COLOR_MODES_STANDARD.light ? lightSvg : darkSvg;
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
    zIndex: Number(euiTheme.levels.navigation) + 1000,
    background: 'inherit',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    overflow: 'auto',
    [euiCanAnimate]: {
      opacity: 0,
      animation: `${fullScreenGraphicsFadeIn} ${euiTheme.animation.extraSlow} ${euiTheme.animation.resistance} 0s forwards`,
    },
    '.kbnBody--hasHeaderBanner &': {
      top: 'var(--kbnHeaderBannerHeight)',
    },
    '&::before, &::after': {
      position: 'fixed',
      zIndex: 1,
      width: '400px',
      height: '400px',
      content: `url(${lightOrDarkTheme(bg_top_branded, bg_top_branded_dark)})`,
      [`@media (max-width: ${euiTheme.breakpoint.l}px)`]: {
        content: 'none',
      },
    },
    '&::before': {
      top: 0,
      left: 0,
      content: `url(${lightOrDarkTheme(bg_top_branded, bg_top_branded_dark)})`,
    },
    '&::after': {
      bottom: 0,
      right: 0,
      content: `url(${lightOrDarkTheme(bg_bottom_branded, bg_bottom_branded_dark)})`,
    },
  });
};

export const useKbnFullScreenBgCss = () => {
  const euiTheme = useEuiTheme();
  const styles = useMemo(() => kbnFullScreenBgCss(euiTheme), [euiTheme]);
  return styles;
};
