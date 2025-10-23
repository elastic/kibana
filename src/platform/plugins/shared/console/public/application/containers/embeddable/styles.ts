/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  makeHighContrastColor,
  tint,
  useEuiScrollBar,
  useEuiTheme,
  useIsDarkMode,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

export const useEmbeddableConsoleStyleVariables = () => {
  const { euiTheme } = useEuiTheme();
  const isDark = useIsDarkMode();
  const background = isDark ? euiTheme.colors.ink : euiTheme.colors.darkestShade;
  const baseTextColor = makeHighContrastColor(euiTheme.colors.lightestShade)(background);
  const text = tint(baseTextColor, 0.2);

  const initialHeight = euiTheme.size.xxl;
  const maxHeight = `calc(${layoutVar('application.content.height', '100vh')} - ${
    euiTheme.size.base
  })`;
  return {
    background,
    text,
    initialHeight,
    maxHeight,
  };
};

export const useEmbeddableConsoleContentStyles = () => {
  const { initialHeight } = useEmbeddableConsoleStyleVariables();
  const { euiTheme } = useEuiTheme();
  const scrollBarStyle = useEuiScrollBar();
  return css`
    ${scrollBarStyle}
    overflow-y: auto;
    width: 100%;
    height: calc(100% - ${initialHeight});
    background-color: ${euiTheme.colors.body};
    animation-name: embeddableConsoleShowContent;
    animation-duration: ${euiTheme.animation.slow};
    animation-iteration-count: 1;
    animation-timing-function: ${euiTheme.animation.resistance};
    color: ${euiTheme.colors.darkestShade};

    #consoleRoot {
      height: 100%;
    }

    @keyframes embeddableConsoleShowContent {
      0% {
        opacity: 0;
      }

      100% {
        opacity: 1;
      }
    }
  `;
};
