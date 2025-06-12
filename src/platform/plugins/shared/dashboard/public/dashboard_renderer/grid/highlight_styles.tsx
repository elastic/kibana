/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

const borderSpinKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '10%': {
    opacity: 1,
  },
  '60%': {
    opacity: 1,
  },
  '100%': {
    '--highlight-rotate': '360deg',
    opacity: 0,
  },
});

const shineKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '30%': {
    opacity: 0.7,
  },
  '60%': {
    opacity: 0,
  },
  '100%': {
    '--highlight-rotate': '360deg',
    opacity: 0,
  },
});

const shimmerKeyframes = keyframes({
  '0%': {
    '--shimmer-position': '100%',
    opacity: 0,
  },
  '30%': {
    '--shimmer-position': '0%',
    opacity: 0.3,
  },
  '35%': {
    '--shimmer-position': '0%',
    opacity: 0,
  },
  '100%': {
    '--shimmer-position': '0%',
    opacity: 0,
  },
});

export const highlightGlobalStyles = css`
  @property --shimmer-position {
    syntax: '<percentage>';
    inherits: false;
    initial-value: 50%;
  }
  @property --highlight-rotate {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
`;

export const getHighlightStyles = (context: UseEuiTheme) => {
  const { euiTheme } = context;
  const rotatingGradient = `
    linear-gradient(var(--highlight-rotate), 
    ${euiTheme.colors.borderBaseSuccess} 0%,
    ${euiTheme.colors.borderBaseAccent} 46%,
    ${euiTheme.colors.borderBaseAccentSecondary} 100%
  )`;
  const shimmerGradient = `linear-gradient(-45deg, transparent 45%, ${euiTheme.colors.backgroundLightNeutral} 50%, transparent 55%)`;

  const brightenInDarkMode = (brightness: number) =>
    context.colorMode === 'DARK' ? `brightness(${brightness})` : '';

  return css({
    '&.dshDashboardGrid__item--highlighted .embPanel': {
      position: 'relative',
      overflow: 'visible !important',
      outline: 'none !important',
    },
    '&.dshDashboardGrid__item--highlighted .embPanel::before': {
      content: `""`,
      opacity: 0,
      position: 'absolute',
      left: '-2.5px',
      top: '-2.5px',
      'z-index': -1,
      width: 'calc(100% + 5px)',
      height: 'calc(100% + 5px)',
      'background-image': rotatingGradient,
      filter: brightenInDarkMode(1.5),
      'border-radius': `${euiTheme.border.radius.small}`,
      animation: `${borderSpinKeyframes} 3s ease-out`,
    },
    '&.dshDashboardGrid__item--highlighted .embPanel::after': {
      content: `""`,
      opacity: 0,
      position: 'absolute',
      left: '-10px',
      top: '-10px',
      'z-index': -2,
      width: 'calc(100% + 20px)',
      height: 'calc(100% + 20px)',
      'background-image': rotatingGradient,
      filter: `${brightenInDarkMode(1.3)} blur(25px)`,
      animation: `${shineKeyframes} 3s ease-out`,
    },
    '&.dshDashboardGrid__item--highlighted .embPanel__content::before': {
      content: `""`,
      'z-index': euiTheme.levels.mask,
      opacity: 0,
      width: '100%',
      height: '100%',
      position: 'absolute',
      'pointer-events': 'none',
      filter: brightenInDarkMode(1.75),
      'background-image': shimmerGradient,
      animation: `${shimmerKeyframes} 3s linear`,
      'background-size': '400%',
      'background-position': 'var(--shimmer-position) 0',
    },
  });
};
