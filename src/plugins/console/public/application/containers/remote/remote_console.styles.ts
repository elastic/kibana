/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css, keyframes } from '@emotion/react';
import { UseEuiTheme, euiCanAnimate, logicalCSS } from '@elastic/eui';

const remoteConsoleAppear = keyframes`
  0% {
    transform: translateY(100%);
    opacity: 0;
  }

  100% {
    transform: translateY(0%);
    opacity: 1;
  }
`;

export const remoteConsoleStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  return {
    container: css`
      position: sticky;
      ${logicalCSS('bottom', 0)}
      ${logicalCSS('left', 0)}
      z-index: ${Number(euiTheme.levels.header) - 2};
      ${euiCanAnimate} {
        animation: ${remoteConsoleAppear} ${euiTheme.animation.slow}
          ${euiTheme.animation.resistance};
      }
    `,
  };
};
