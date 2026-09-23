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
import type { UseEuiTheme } from '@elastic/eui';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';

export const kbnFullScreenBgCss = ({ euiTheme, colorMode }: UseEuiTheme) => {
  const fullScreenGraphicsFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;
  // Match the top stop of the framed chrome canvas. The dark shade scale inverts,
  // so lightestShade is that stop in light mode and colors.body is that stop in dark.
  const pageBackground =
    colorMode === 'DARK' ? euiTheme.colors.body : euiTheme.colors.lightestShade;
  return css({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: Number(euiTheme.levels.navigation) + 1000,
    background: 'inherit',
    backgroundColor: pageBackground,
    overflow: 'auto',
    [euiCanAnimate]: {
      opacity: 0,
      animation: `${fullScreenGraphicsFadeIn} ${euiTheme.animation.extraSlow} ${euiTheme.animation.resistance} 0s forwards`,
    },
    '.kbnBody--hasHeaderBanner &': {
      top: 'var(--kbnHeaderBannerHeight)',
    },
  });
};

export const useKbnFullScreenBgCss = () => {
  const euiTheme = useEuiTheme();
  const styles = useMemo(() => kbnFullScreenBgCss(euiTheme), [euiTheme]);
  return styles;
};
