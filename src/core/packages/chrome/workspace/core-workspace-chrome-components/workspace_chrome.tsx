/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

import type { WorkspaceTool } from '@kbn/core-workspace-chrome-state';

import { useNavigationWidth } from '@kbn/core-workspace-chrome-state';
import { WorkspaceHeader } from './header';
import {
  WorkspaceNavigation,
  type WorkspaceNavigationProps,
} from './navigation/workspace_navigation';

export interface WorkspaceChromeProps extends WorkspaceNavigationProps {
  breadcrumbs?: ChromeBreadcrumb[];
  tools?: WorkspaceTool[];
}

export const WorkspaceChrome = ({
  breadcrumbs = [],
  tools = [],
  items,
  logo,
}: WorkspaceChromeProps) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');
  const navigationWidth = useNavigationWidth();

  const root = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};

    .kbnChromeLayoutApplication {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      ${shadow};
      border-radius: ${euiTheme.border.radius.medium};
      height: calc(100% - ${euiTheme.size.s});
    }

    .kbnChromeLayoutNavigation {
      justify-content: center;
    }
  `;

  return (
    <ChromeLayoutConfigProvider
      value={{
        bannerHeight: 48,
        footerHeight: 48,
        headerHeight: 48,
        navigationWidth,
        sidebarWidth: 48,
        applicationTopBarHeight: 48,
        applicationBottomBarHeight: 48,
      }}
    >
      <ChromeLayout
        css={root}
        header={<WorkspaceHeader {...{ breadcrumbs }} />}
        navigation={<WorkspaceNavigation items={items} logo={logo} />}
        sidebar={<div>Sidebar</div>}
      >
        Hello world
      </ChromeLayout>
    </ChromeLayoutConfigProvider>
  );
};
