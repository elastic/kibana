/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme, useEuiBreakpoint } from '@elastic/eui';

import { layoutVar } from '@kbn/core-chrome-layout-constants';
import { useEmbeddableConsoleContentStyles, useEmbeddableConsoleStyleVariables } from './styles';

export const useStyles = () => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const variables = useEmbeddableConsoleStyleVariables();

  return {
    embeddableConsoleGlobal: css`
      .kbnBody--hasEmbeddableConsole .euiPageTemplate main {
        // Ensure page content is not overlapped by console control bar
        padding-bottom: ${euiTheme.size.xxl};
      }
    `,

    embeddableConsole: css`
      background: ${variables.background};
      color: ${variables.text};
      display: flex;
      flex-direction: column;
      // This large box shadow helps prevent a flicker of dark
      // background when the content is shown and hidden
      box-shadow: inset 0 ${variables.initialHeight} 0 ${variables.background},
        inset 0 600rem 0 ${euiTheme.colors.body};
      bottom: ${layoutVar('application.content.bottom', '0px')};
      right: ${layoutVar('application.content.right', '0px')};
      transform: translateY(0);
      height: ${variables.initialHeight};
      max-height: ${variables.maxHeight};

      ${useEuiBreakpoint(['xs', 's'])} {
        display: none;
      }
    `,

    embeddableConsoleOpen: css`
      animation-duration: ${euiTheme.animation.normal};
      animation-timing-function: ${euiTheme.animation.resistance};
      animation-fill-mode: forwards;
      animation-name: embeddableConsoleOpenPanel;
      height: var(--embedded-console-height);
      bottom: calc(
        var(--embedded-console-bottom) + ${layoutVar('application.content.bottom', '0px')}
      );

      @keyframes embeddableConsoleOpenPanel {
        0% {
          transform: translateY(-${variables.initialHeight});
        }

        100% {
          transform: translateY(var(--embedded-console-bottom));
        }
      }
    `,

    embeddableConsoleChromeProject: css`
      left: calc(
        var(--euiCollapsibleNavOffset, 0) + ${layoutVar('application.content.left', '0px')}
      );
    `,

    embeddableConsoleChromeClassic: css`
      left: calc(var(--kbnSolutionNavOffset, 0) + ${layoutVar('application.content.left', '0px')});
    `,

    embeddableConsoleChromeDefault: css`
      left: ${layoutVar('application.content.left', '0px')};
    `,

    embeddableConsoleFixed: css`
      position: fixed;
      z-index: calc(${euiTheme.levels.header} - 2);
    `,

    embeddableConsoleControls: css`
      height: ${variables.initialHeight};
      width: 100%;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      overflow-y: hidden; // Ensures the movement of buttons in :focus don't cause scrollbars
      overflow-x: auto;
      padding-right: ${euiTheme.size.s};
    `,

    embeddableConsoleControlsButton: css`
      flex-grow: 1;
      width: 100%;

      .euiButtonEmpty__content {
        justify-content: flex-start;
      }
    `,

    embeddableControlsAltViewButtonContainer: css`
      margin-left: auto;
    `,
    embeddableConsoleContent: useEmbeddableConsoleContentStyles(),
  };
};
