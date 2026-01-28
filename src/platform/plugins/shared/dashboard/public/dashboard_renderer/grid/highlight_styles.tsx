/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { highlightAnimationDuration } from '../../dashboard_api/track_panel';

const borderSpinKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '10%, 60%': {
    opacity: 1,
  },
  '100%': {
    '--highlight-rotate': '180deg',
    opacity: 0,
  },
});

const getOutlineFadeKeyframes = ({ euiTheme }: UseEuiTheme) =>
  keyframes({
    '0%, 70%': {
      outline: `${euiTheme.border.width.thin} dashed transparent`,
    },
    '100%': {
      outline: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`,
    },
  });

const shineKeyframes = keyframes({
  '0%': {
    '--highlight-rotate': '0deg',
    opacity: 0,
  },
  '10%': {
    opacity: 0.7,
  },
  '100%': {
    '--highlight-rotate': '180deg',
    opacity: 0,
  },
});

const highlightPropertyStyles = css`
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

  const brightenInDarkMode = (brightness: number) =>
    context.colorMode === 'DARK' ? `brightness(${brightness})` : '';

  return css([
    highlightPropertyStyles,
    {
      '&.dshDashboardGrid__item--highlighted .embPanel': {
        position: 'relative',
        overflow: 'visible !important',
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        animation: `${getOutlineFadeKeyframes(context)} ${highlightAnimationDuration}ms ease-out`,
      },
      '&.dshDashboardGrid__item--highlighted:not(&.dshDashboardGrid__item--focused) .embPanel::before':
        {
          content: `""`,
          opacity: 0,
          position: 'absolute',
          left: '-5px',
          top: '-5px',
          'z-index': -1,
          width: 'calc(100% + 10px)',
          height: 'calc(100% + 10px)',
          backgroundImage: rotatingGradient,
          filter: brightenInDarkMode(1.5),
          borderRadius: euiTheme.border.radius.medium,
          animation: `${borderSpinKeyframes} ${highlightAnimationDuration}ms ease-out`,
        },
      '&.dshDashboardGrid__item--highlighted .embPanel::after': {
        content: `""`,
        opacity: 0,
        position: 'absolute',
        left: '-15px',
        top: '-15px',
        'z-index': -2,
        width: 'calc(100% + 30px)',
        height: 'calc(100% + 30px)',
        backgroundImage: rotatingGradient,
        filter: `${brightenInDarkMode(1.3)} blur(25px)`,
        animation: `${shineKeyframes} ${highlightAnimationDuration}ms ease-out`,
      },

      // Call out focused panels with a simple border
      '&.dshDashboardGrid__item--focused .embPanel': {
        outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`,
      },
    },
  ]);
};
