/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css, keyframes } from '@emotion/react';
import { COLOR_MODES_STANDARD, UseEuiTheme } from '@elastic/eui';
import bg_top_branded from '../assets/bg_top_branded.svg';
import bg_top_branded_dark from '../assets/bg_top_branded_dark.svg';
import bg_bottom_branded from '../assets/bg_bottom_branded.svg';
import bg_bottom_branded_dark from '../assets/bg_bottom_branded_dark.svg';

const fullScreenGraphicsFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;
// not sure if svg ever worked
export const fullScreenGraphicsMixinStyles = (euiZLevel: number, euiTheme: UseEuiTheme) => {
  const lightOrDarkTheme = (lightSvg: any, darkSvg: any) => {
    const result = euiTheme.colorMode === COLOR_MODES_STANDARD.light ? lightSvg : darkSvg; // nothing changes
    return result;
  };
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
    animation: `${fullScreenGraphicsFadeIn} ${euiTheme.euiTheme.animation.extraSlow} ${euiTheme.euiTheme.animation.resistance} 0s forwards`,
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
