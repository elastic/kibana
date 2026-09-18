/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { ChromeLayoutConfig } from '@kbn/ui-chrome-layout';
import {
  AGENT_FIRST_LAYOUT_OVERRIDES,
  ChromeLayout,
  ChromeLayoutConfigProvider,
  DEFAULT_AGENT_WIDTH,
  clampAgentWorkspaceWidth,
  isAgentFirst,
  resolveAgentPanelTargetWidth,
} from '@kbn/ui-chrome-layout';
import {
  AgentFirstApplicationWorkspaceBridge,
  AgentFirstProjectSideNav,
  AgentWorkspacePanel,
  AgentWorkspaceSlot,
  ChromeComponentsProvider,
  ClassicHeader,
  ChromeNextGlobalHeader,
  ChromeAppHeaderRenderer,
  GridLayoutProjectSideNav,
  HeaderTopBanner,
  ChromelessHeader,
  Sidebar,
  useHasChromeAppHeaderContent,
  useHasInlineAppHeader,
} from '@kbn/core-chrome-browser-components';
import type { ChromeComponentsDeps } from '@kbn/core-chrome-browser-components';
import {
  useAgentWorkspaceOpen,
  useApplicationWorkspaceOpen,
  useChromeStyle,
  useIsChromeVisible,
  useSidebarWidth,
  useSideNavWidth,
} from '@kbn/core-chrome-browser-hooks';
import { useGlobalFooter, useHasHeaderBanner } from '@kbn/core-chrome-browser-hooks/internal';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
import { AppWrapper } from '../../app_containers';
import { APP_FIXED_VIEWPORT_ID } from '../../app_fixed_viewport';
import { KibanaGridLayoutGlobalStyles } from './kibana_grid_global_styles';

const layoutConfigs: {
  classic: ChromeLayoutConfig;
  project: ChromeLayoutConfig;
} = {
  classic: {
    appearance: 'plain',
    headerHeight: 96,
    bannerHeight: 32,
    sidebarWidth: 0,
    footerHeight: 0,
    navigationWidth: 0,
  },
  project: {
    appearance: 'framed',
    headerHeight: 48,
    bannerHeight: 32,
    /** Start at 0; ChromeAppHeaderRenderer measures and updates this when the slot is used. */
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
      const hasInlineAppHeader = useHasInlineAppHeader();
      const hasChromeAppHeaderContent = useHasChromeAppHeaderContent();
      const footer = useGlobalFooter();
      const sidebarWidth = useSidebarWidth();
      const navigationWidth = useSideNavWidth();
      const applicationWorkspaceOpen = useApplicationWorkspaceOpen();
      const agentWorkspaceOpen = useAgentWorkspaceOpen();

      const layoutConfigKey = chromeStyle === 'classic' ? 'classic' : 'project';
      const showAgentWorkspace = agentFirstEnabled && chromeVisible && chromeStyle === 'project';
      const effectiveApplicationWorkspaceOpen = showAgentWorkspace
        ? applicationWorkspaceOpen
        : true;
      const effectiveAgentWorkspaceOpen = showAgentWorkspace ? agentWorkspaceOpen : true;

      const [agentWorkspaceWidth, setAgentWorkspaceWidth] = useState(DEFAULT_AGENT_WIDTH);

      const setAgentWorkspaceWidthClamped = useCallback(
        (width: number) => {
          setAgentWorkspaceWidth(
            clampAgentWorkspaceWidth(
              width,
              navigationWidth,
              sidebarWidth,
              effectiveApplicationWorkspaceOpen,
              effectiveAgentWorkspaceOpen
            )
          );
        },
        [
          effectiveAgentWorkspaceOpen,
          effectiveApplicationWorkspaceOpen,
          navigationWidth,
          sidebarWidth,
        ]
      );

      useLayoutEffect(() => {
        if (!showAgentWorkspace) {
          return;
        }

        const reclamp = () => {
          setAgentWorkspaceWidth((current) =>
            clampAgentWorkspaceWidth(
              current,
              navigationWidth,
              sidebarWidth,
              effectiveApplicationWorkspaceOpen,
              effectiveAgentWorkspaceOpen
            )
          );
        };

        reclamp();
        window.addEventListener('resize', reclamp);
        return () => window.removeEventListener('resize', reclamp);
      }, [
        effectiveAgentWorkspaceOpen,
        effectiveApplicationWorkspaceOpen,
        navigationWidth,
        showAgentWorkspace,
        sidebarWidth,
      ]);

      const layoutConfig = {
        ...layoutConfigs[layoutConfigKey],
        ...(showAgentWorkspace ? AGENT_FIRST_LAYOUT_OVERRIDES : {}),
        ...(showAgentWorkspace
          ? {
              agentWidth: resolveAgentPanelTargetWidth({
                agentWorkspaceOpen: effectiveAgentWorkspaceOpen,
                applicationWorkspaceOpen: effectiveApplicationWorkspaceOpen,
                agentPreferredWidth: agentWorkspaceWidth,
                navigationWidth,
                sidebarWidth,
                applicationMarginRight: AGENT_FIRST_LAYOUT_OVERRIDES.applicationMarginRight ?? 0,
              }),
              applicationWorkspaceOpen: effectiveApplicationWorkspaceOpen,
              agentWorkspaceOpen: effectiveAgentWorkspaceOpen,
            }
          : {}),
        sidebarWidth,
        navigationWidth,
      };

      // Assign main layout parts first
      let header: ReactNode;
      let navigation: ReactNode;
      let banner: ReactNode;
      let applicationTopBar: ReactNode;
      let agent: ReactNode;

      if (chromeVisible) {
        if (chromeStyle === 'classic') {
          header = <ClassicHeader />;
        } else if (showAgentWorkspace) {
          navigation = <AgentFirstProjectSideNav />;
          agent = (
            <AgentWorkspacePanel
              width={agentWorkspaceWidth}
              navigationWidth={navigationWidth}
              sidebarWidth={sidebarWidth}
              applicationWorkspaceOpen={effectiveApplicationWorkspaceOpen}
              agentWorkspaceOpen={effectiveAgentWorkspaceOpen}
              onWidthChange={setAgentWorkspaceWidthClamped}
            >
              <AgentWorkspaceSlot />
            </AgentWorkspacePanel>
          );
        } else {
          header = <ChromeNextGlobalHeader />;
          if (!hasInlineAppHeader && hasChromeAppHeaderContent) {
            applicationTopBar = <ChromeAppHeaderRenderer />;
          }

          navigation = <GridLayoutProjectSideNav />;
        }
      }

      if (hasHeaderBanner) {
        banner = <HeaderTopBanner position="static" />;
      }

      return (
        <>
          <KibanaGridLayoutGlobalStyles appearance={layoutConfig.appearance ?? 'plain'} />
          {showAgentWorkspace && <AgentFirstApplicationWorkspaceBridge />}
          <ChromeLayoutConfigProvider value={layoutConfig}>
            <ChromeLayout
              header={header}
              agent={agent}
              sidebar={<Sidebar />}
              footer={footer}
              navigation={navigation}
              banner={banner}
              applicationTopBar={applicationTopBar}
            >
              <>
                {!chromeVisible && <ChromelessHeader />}

                <div id="globalBannerList">{appBannerComponent}</div>
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
