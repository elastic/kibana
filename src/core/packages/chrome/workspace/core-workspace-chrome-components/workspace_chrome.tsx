/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';

import {
  useIsSidebarFullSize,
  useNavigationWidth,
  useSidebarWidth,
  useWorkspaceDispatch,
  setSidebarFullscreen,
} from '@kbn/core-workspace-chrome-state';

import { layoutVarName } from '@kbn/core-chrome-layout-constants';

// Helper function to get sidebar width, considering fullscreen state
const getSidebarWidth = (width: number | null, isFullscreen: boolean): number => {
  if (!width || isFullscreen) {
    return 0; // Fullscreen overrides width
  }
  return width;
};

import { setApplicationWidth } from '@kbn/core-workspace-chrome-state/layout/slice';

// Constants for sidebar resizing behavior
const MAX_SIDEBAR_WIDTH_RATIO = 0.5; // 50% of available width
import { WorkspaceHeader as Header, type WorkspaceHeaderProps } from './header';
import { WorkspaceNavigation as Navigation, type WorkspaceNavigationProps } from './navigation';
import { WorkspaceSidebarPanel as SidebarPanel, type WorkspaceSidebarPanelProps } from './sidebar';
import { WorkspaceAppTopBar as AppTopBar, type WorkspaceAppTopBarProps } from './app_top_bar';

type WorkspaceChromeChildren =
  | React.ReactElement<WorkspaceHeaderProps>
  | React.ReactElement<WorkspaceNavigationProps>
  | React.ReactElement<WorkspaceSidebarPanelProps>
  | React.ReactElement<WorkspaceAppTopBarProps>;

export interface WorkspaceChromeProps {
  children: WorkspaceChromeChildren | React.ReactNode;
}

const extractChildren = (children: React.ReactNode, ...components: React.ComponentType<any>[]) => {
  const childrenArray = React.Children.toArray(children);
  const extracted: Record<string, React.ReactElement | undefined> = {};
  const remaining: React.ReactNode[] = [];

  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      const componentIndex = components.findIndex((Component) => child.type === Component);
      if (componentIndex !== -1) {
        extracted[components[componentIndex].name] = child;
      } else {
        remaining.push(child);
      }
    } else {
      remaining.push(child);
    }
  });

  return { extracted, remaining };
};

const WorkspaceChromeComponent = ({ children }: WorkspaceChromeProps) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');
  const navigationWidth = useNavigationWidth();
  const sidebarWidth = useSidebarWidth();
  const isSidebarFullSize = useIsSidebarFullSize();
  const dispatch = useWorkspaceDispatch();

  useEffect(() => {
    const calculateWidth = () => {
      const availableWidth = window.innerWidth - navigationWidth - 8;
      const currentSidebarWidth = sidebarWidth || 0;
      const applicationWidth = availableWidth - currentSidebarWidth;

      dispatch(setApplicationWidth(applicationWidth));

      // If sidebar width exceeds 50% of available width, go fullscreen
      if (currentSidebarWidth > availableWidth * MAX_SIDEBAR_WIDTH_RATIO && !isSidebarFullSize) {
        dispatch(setSidebarFullscreen(true));
      }
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);

    return () => {
      window.removeEventListener('resize', calculateWidth);
    };
  }, [navigationWidth, sidebarWidth, dispatch, isSidebarFullSize]);

  const fullScreenStyles = css`
    .kbnChromeLayoutApplication,
    .kbnChromeLayoutHeader {
      display: none;
    }

    .kbnChromeLayoutSidebar {
      width: calc(var(${layoutVarName('application.width')}));
      height: 100vh;
      bottom: ${euiTheme.size.s};
      right: ${euiTheme.size.s};
    }
  `;

  const root = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};

    .kbnChromeLayoutApplication {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      ${shadow};
      border-radius: ${euiTheme.border.radius.medium};
      height: var(--kbn-layout--application-height);
    }

    .euiPageTemplate {
      background-color: ${euiTheme.colors.backgroundBasePlain};

      & > main > section:first-child {
        margin: ${euiTheme.size.base};
        inline-size: calc(100% - (${euiTheme.size.base} * 2));
        border-radius: ${euiTheme.border.radius.medium};

        & + hr {
          display: none;
        }
      }
    }

    ${isSidebarFullSize && fullScreenStyles}
  `;

  const {
    extracted: { WorkspaceHeader, WorkspaceNavigation, WorkspaceSidebarPanel, WorkspaceAppTopBar },
    remaining,
  } = extractChildren(
    children,
    WorkspaceChrome.Header,
    WorkspaceChrome.Navigation,
    WorkspaceChrome.SidebarPanel,
    WorkspaceChrome.AppTopBar
  );

  return (
    <ChromeLayoutConfigProvider
      value={{
        bannerHeight: 48,
        footerHeight: 48,
        headerHeight: 48,
        navigationWidth,
        sidebarWidth: getSidebarWidth(sidebarWidth, isSidebarFullSize),
        applicationTopBarHeight: 48,
        applicationBottomBarHeight: 48,
      }}
    >
      <ChromeLayout
        css={root}
        header={WorkspaceHeader}
        navigation={WorkspaceNavigation}
        sidebar={WorkspaceSidebarPanel}
        applicationTopBar={WorkspaceAppTopBar}
        applicationBottomBar={null}
        banner={null}
        footer={null}
      >
        {remaining}
      </ChromeLayout>
    </ChromeLayoutConfigProvider>
  );
};

export const WorkspaceChrome = Object.assign(WorkspaceChromeComponent, {
  Header,
  Navigation,
  SidebarPanel,
  AppTopBar,
});
