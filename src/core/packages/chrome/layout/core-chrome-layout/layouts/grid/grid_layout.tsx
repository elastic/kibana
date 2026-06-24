/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { ChromeLayoutConfig } from '@kbn/ui-chrome-layout';
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/ui-chrome-layout';
import {
  ChromeComponentsProvider,
  ClassicHeader,
  ChromeNextGlobalHeader,
  ChromeAppHeaderRenderer,
  ProjectHeader,
  GridLayoutProjectSideNav,
  HeaderTopBanner,
  ChromelessHeader,
  AppMenuBar,
  Sidebar,
  AgentWorkspacePanel,
  AgentWorkspaceSlot,
  ApplicationWorkspaceBootstrap,
  useHasAppMenu,
  useHasChromeAppHeaderContent,
  useHasInlineAppHeader,
} from '@kbn/core-chrome-browser-components';
import type { ChromeComponentsDeps } from '@kbn/core-chrome-browser-components';
import {
  useChromeStyle,
  useIsChromeVisible,
  useIsNextChrome,
  useSidebarWidth,
  useSideNavWidth,
} from '@kbn/core-chrome-browser-hooks';
import { isAgentFirst } from '@kbn/core-chrome-feature-flags';
import { useGlobalFooter, useHasHeaderBanner } from '@kbn/core-chrome-browser-hooks/internal';
import {
  AGENT_FIRST_LAYOUT_OVERRIDES,
  AgentFirstChromeGlobalStyles,
  GridLayoutGlobalStyles,
} from '@kbn/ui-chrome-layout';
import {
  clampAgentWorkspaceWidth,
  DEFAULT_AGENT_WIDTH,
} from '@kbn/ui-chrome-layout-constants';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';

const layoutConfigs: {
  classic: ChromeLayoutConfig;
  project: ChromeLayoutConfig;
  projectNext: ChromeLayoutConfig;
} = {
  classic: {
    chromeStyle: 'classic',
    headerHeight: 96,
    bannerHeight: 32,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
  project: {
    chromeStyle: 'project',
    headerHeight: 48,
    bannerHeight: 32,

    /** Project style renders the app-specific menu in a separate top bar. */
    applicationTopBarHeight: 48,
    applicationMarginRight: 8,
    applicationMarginBottom: 8,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
  projectNext: {
    chromeStyle: 'project',
    headerHeight: 48,
    bannerHeight: 32,
    /** Chrome Next folds app-level header controls into the new header surface. */
    applicationTopBarHeight: 0,
    applicationMarginRight: 8,
    applicationMarginBottom: 8,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
};

/**
 * Service for providing layout component wired to other core services.
 */
export class GridLayout implements LayoutService {
  constructor(private readonly deps: LayoutServiceStartDeps) {}

  /**
   * Returns a layout component with the provided dependencies
   */
  public getComponent(): React.ComponentType {
    const { application, overlays, http, docLinks, customBranding, featureFlags } = this.deps;

    const appComponent = application.getComponent();
    const appBannerComponent = overlays.banners.getComponent();
    const agentFirstEnabled = isAgentFirst(featureFlags);

    const componentDeps: ChromeComponentsDeps = {
      application,
      http,
      docLinks,
      customBranding,
    };

    const GridLayoutContent = React.memo(() => {
      const chromeVisible = useIsChromeVisible();
      const hasHeaderBanner = useHasHeaderBanner();
      const chromeStyle = useChromeStyle();
      const isNextChromeEnabled = useIsNextChrome();
      const hasAppMenu = useHasAppMenu();
      const hasInlineAppHeader = useHasInlineAppHeader();
      const hasChromeAppHeaderContent = useHasChromeAppHeaderContent();
      const footer = useGlobalFooter();
      const sidebarWidth = useSidebarWidth();
      const navigationWidth = useSideNavWidth();

      const showAgentWorkspace =
        agentFirstEnabled &&
        isNextChromeEnabled &&
        chromeVisible &&
        chromeStyle === 'project';

      const [agentWorkspaceWidth, setAgentWorkspaceWidth] = useState(DEFAULT_AGENT_WIDTH);

      const setAgentWorkspaceWidthClamped = useCallback(
        (width: number) => {
          setAgentWorkspaceWidth(clampAgentWorkspaceWidth(width, navigationWidth, sidebarWidth));
        },
        [navigationWidth, sidebarWidth]
      );

      useLayoutEffect(() => {
        if (!showAgentWorkspace) {
          return;
        }

        setAgentWorkspaceWidth((current) =>
          clampAgentWorkspaceWidth(current, navigationWidth, sidebarWidth)
        );
      }, [navigationWidth, showAgentWorkspace, sidebarWidth]);

      const layoutConfigKey =
        chromeStyle === 'classic' ? 'classic' : isNextChromeEnabled ? 'projectNext' : 'project';

      const layoutConfig = useMemo(
        () => ({
          ...layoutConfigs[layoutConfigKey],
          ...(showAgentWorkspace ? AGENT_FIRST_LAYOUT_OVERRIDES : {}),
          sidebarWidth,
          navigationWidth,
          agentWidth: showAgentWorkspace ? agentWorkspaceWidth : 0,
          applicationWorkspaceWidth: 0,
        }),
        [
          agentWorkspaceWidth,
          layoutConfigKey,
          navigationWidth,
          showAgentWorkspace,
          sidebarWidth,
        ]
      );

      // Assign main layout parts first
      let header: ReactNode;
      let navigation: ReactNode;
      let agent: ReactNode;
      let banner: ReactNode;
      let applicationTopBar: ReactNode;

      if (chromeVisible) {
        if (chromeStyle === 'classic') {
          header = <ClassicHeader />;
        } else {
          header = isNextChromeEnabled ? <ChromeNextGlobalHeader /> : <ProjectHeader />;
          if (isNextChromeEnabled) {
            if (!hasInlineAppHeader && hasChromeAppHeaderContent) {
              applicationTopBar = <ChromeAppHeaderRenderer />;
            }
          } else if (hasAppMenu) {
            applicationTopBar = <AppMenuBar />;
          }

          navigation = <GridLayoutProjectSideNav />;
        }
      }

      if (hasHeaderBanner) {
        banner = <HeaderTopBanner position="static" />;
      }

      if (showAgentWorkspace) {
        agent = (
            <AgentWorkspacePanel
            width={agentWorkspaceWidth}
            navigationWidth={navigationWidth}
            sidebarWidth={sidebarWidth}
            onWidthChange={setAgentWorkspaceWidthClamped}
          >
            <AgentWorkspaceSlot />
          </AgentWorkspacePanel>
        );
      }

      return (
        <>
          {showAgentWorkspace && <AgentFirstChromeGlobalStyles />}
          <GridLayoutGlobalStyles chromeStyle={chromeStyle} hasAgentWorkspace={showAgentWorkspace} />
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={header}
              sidebar={<Sidebar />}
              footer={footer}
              navigation={navigation}
              agent={agent}
              banner={banner}
              applicationTopBar={applicationTopBar}
            >
              <>
                {!chromeVisible && <ChromelessHeader />}

                <div id="globalBannerList">{appBannerComponent}</div>
                {showAgentWorkspace && <ApplicationWorkspaceBootstrap />}
                <AppWrapper chromeVisible={chromeVisible}>
                  <div id={APP_FIXED_VIEWPORT_ID} />
                  {appComponent}
                </AppWrapper>
              </>
            </ChromeLayout>
          </ChromeLayoutConfigProvider>
        </>
      );
    });

    return () => (
      <ChromeComponentsProvider value={componentDeps}>
        <GridLayoutContent />
      </ChromeComponentsProvider>
    );
  }
}
