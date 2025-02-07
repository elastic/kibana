/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { WorkspaceComponentProps } from './workspace.component';

const dimensions = {
  banner: {
    height: 32,
  },
  navigation: {
    width: {
      collapsed: 48,
      expanded: 248,
    },
  },
  header: {
    height: 48,
  },
  toolbox: {
    width: 56,
  },
  tool: {
    width: {
      regular: 400,
      wide: 800,
    },
  },
  footer: {
    height: 48,
  },
} as const;

const base = css`
  position: sticky;
  overflow: hidden;
`;

export interface WorkspaceGlobalStyleArgs extends Omit<WorkspaceComponentProps, 'children'> {
  hasBanner: boolean;
  hasFooter: boolean;
}

export const useWorkspaceStyles = () => {
  const { euiTheme } = useEuiTheme();

  const global = ({
    isNavigationOpen,
    isToolboxOpen,
    toolboxWidth,
    hasBanner,
    hasFooter,
  }: WorkspaceGlobalStyleArgs) => {
    let toolWidth = `0px`;

    if (isToolboxOpen) {
      switch (toolboxWidth) {
        case 'wide':
          toolWidth = `${dimensions.tool.width.wide}px`;
          break;
        case 'regular':
          toolWidth = `${dimensions.tool.width.regular}px`;
          break;
      }
    }

    return css`
      :root {
        /* Banner */
        --kbnWorkspace--banner-top: 0px;
        --kbnWorkspace--banner-height: ${hasBanner ? dimensions.banner.height : 0}px;
        --kbnWorkspace--banner-width: 100%;

        /* Header */
        --kbnWorkspace--header-top: var(--kbnWorkspace--banner-height);
        --kbnWorkspace--header-height: ${dimensions.header.height}px;
        --kbnWorkspace--header-width: calc(
          100vw - var(--kbnWorkspace--toolbox-width) - var(--kbnWorkspace--tool-width)
        );

        /* Navigation */
        --kbnWorkspace--navigation-top: calc(
          var(--kbnWorkspace--banner-height) + var(--kbnWorkspace--header-height)
        );
        --kbnWorkspace--navigation-height: calc(
          100vh - var(--kbnWorkspace--banner-height) - var(--kbnWorkspace--header-height)
        );
        --kbnWorkspace--navigation-width: ${isNavigationOpen
          ? dimensions.navigation.width.expanded
          : dimensions.navigation.width.collapsed}px;

        /* Toolbox */
        --kbnWorkspace--toolbox-top: var(--kbnWorkspace--header-top);
        --kbnWorkspace--toolbox-height: calc(100vh - var(--kbnWorkspace--banner-height));
        --kbnWorkspace--toolbox-width: ${dimensions.toolbox.width}px;

        /* Active Tool */
        --kbnWorkspace--tool-top: var(--kbnWorkspace--header-top);
        --kbnWorkspace--tool-height: calc(100vh - var(--kbnWorkspace--banner-height));
        --kbnWorkspace--tool-width: ${toolWidth};

        /* Application */
        --kbnWorkspace--application-top: calc(
          var(--kbnWorkspace--banner-height) + var(--kbnWorkspace--header-height)
        );
        --kbnWorkspace--application-bottom: var(--kbnWorkspace--footer-height);
        --kbnWorkspace--application-left: var(--kbnWorkspace--navigation-width);
        --kbnWorkspace--application-right: calc(
          var(--kbnWorkspace--toolbox-width) + var(--kbnWorkspace--tool-width)
        );
        --kbnWorkspace--application-height: calc(
          100vh - var(--kbnWorkspace--application-top) - var(--kbnWorkspace--application-bottom)
        );
        --kbnWorkspace--application-width: calc(
          100vw - var(--kbnWorkspace--navigation-width) - var(--kbnWorkspace--toolbox-width) -
            var(--kbnWorkspace--tool-width)
        );

        /* Footer */
        --kbnWorkspace--footer-height: ${hasFooter ? dimensions.footer.height : 0}px;
        --kbnWorkspace--footer-width: 100%;
        --kbnWorkspace--footer-bottom: 0;
      }
    `;
  };

  const workspace = css`
    min-height: 100%;
    min-width: 100%;
    display: grid;
    grid-template-columns:
      var(--kbnWorkspace--navigation-width, 0)
      1fr
      var(--kbnWorkspace--toolbox-width, 0)
      var(--kbnWorkspace--tool-width, 0);
    grid-template-rows:
      var(--kbnWorkspace--banner-height, 0)
      var(--kbnWorkspace--header-height, 0)
      1fr
      var(--kbnWorkspace--footer-height, 0);
    grid-template-areas:
      'banner banner banner banner'
      'header header toolbox tool'
      'navigation app toolbox tool'
      'navigation footer toolbox tool';
    align-items: baseline;
  `;

  const banner = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: banner;
    height: var(--kbnWorkspace--banner-height, 0);
    width: var(--kbnWorkspace--banner-width, 100vw);
    top: var(--kbnWorkspace--banner-top, 0);
  `;

  const header = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: header;
    top: var(--kbnWorkspace--header-top, 0);
    height: var(--kbnWorkspace--header-height, 100vh);
    width: var(--kbnWorkspace--header-width, 100vw);
  `;

  const navigation = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: navigation;
    height: var(--kbnWorkspace--navigation-height, 100vh);
    width: var(--kbnWorkspace--navigation-width, 0);
    top: var(--kbnWorkspace--navigation-top, 0);
  `;

  const application = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    grid-area: app;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  `;

  const toolbox = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: toolbox;
    top: var(--kbnWorkspace--toolbox-top, 0);
    height: var(--kbnWorkspace--toolbox-height, 100vh);
    width: var(--kbnWorkspace--toolbox-width, 0);
  `;

  const tool = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: tool;
    top: var(--kbnWorkspace--tool-top, 0);
    height: var(--kbnWorkspace--tool-height, 100vh);
    width: var(--kbnWorkspace--tool-width, 0);
  `;

  const footer = css`
    ${base}
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    grid-area: footer;
    height: var(--kbnWorkspace--footer-height, 0);
    width: var(--kbnWorkspace--footer-width, 100vw);
    bottom: var(--kbnWorkspace--footer-bottom, 0);
  `;

  return {
    global,
    workspace,
    banner,
    header,
    navigation,
    application,
    toolbox,
    tool,
    footer,
  };
};
