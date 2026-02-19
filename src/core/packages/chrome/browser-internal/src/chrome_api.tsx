/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { map } from 'rxjs';
import type { RecentlyAccessedService } from '@kbn/recently-accessed';
import { SidebarServiceProvider } from '@kbn/core-chrome-sidebar-context';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { InternalChromeStart } from './types';
import type { ChromeState } from './state/chrome_state';
import type { NavControlsService } from './services/nav_controls';
import type { NavLinksService } from './services/nav_links';
import type { ProjectNavigationService } from './services/project_navigation';
import type { DocTitleService } from './services/doc_title';

type NavControlsStart = ReturnType<NavControlsService['start']>;
type NavLinksStart = ReturnType<NavLinksService['start']>;
type ProjectNavigationStart = ReturnType<ProjectNavigationService['start']>;
type DocTitleStart = ReturnType<DocTitleService['start']>;
type RecentlyAccessedStart = ReturnType<RecentlyAccessedService['start']>;

interface ChromeComponents {
  getClassicHeader: () => JSX.Element;
  getProjectHeader: () => JSX.Element;
  getProjectSideNav: () => JSX.Element;
  getHeaderBanner: () => JSX.Element;
  getChromelessHeader: () => JSX.Element;
  getProjectAppMenu: () => JSX.Element;
  getSidebar: () => JSX.Element;
}

export interface ChromeApiDeps {
  state: ChromeState;
  services: {
    navControls: NavControlsStart;
    navLinks: NavLinksStart;
    recentlyAccessed: RecentlyAccessedStart;
    docTitle: DocTitleStart;
    projectNavigation: ProjectNavigationStart;
  };
  components: ChromeComponents;
  sidebar: SidebarStart;
}

export function createChromeApi({
  state,
  services,
  components,
  sidebar,
}: ChromeApiDeps): InternalChromeStart {
  const { projectNavigation } = services;

  const validateProjectStyle = () => {
    const style = state.style.chromeStyle.get();
    if (style !== 'project') {
      throw new Error(
        `Invalid ChromeStyle value of "${style}". This method requires ChromeStyle set to "project".`
      );
    }
  };

  const project: InternalChromeStart['project'] = {
    setHome: (homeHref) => {
      validateProjectStyle();
      projectNavigation.setProjectHome(homeHref);
    },
    setCloudUrls: projectNavigation.setCloudUrls.bind(projectNavigation),
    setKibanaName: projectNavigation.setKibanaName.bind(projectNavigation),
    initNavigation: (id, navigationTree$, config) => {
      validateProjectStyle();
      projectNavigation.initNavigation(id, navigationTree$, config);
    },
    getNavigationTreeUi$: () => projectNavigation.getNavigationTreeUi$(),
    setBreadcrumbs: (breadcrumbs, params) =>
      projectNavigation.setProjectBreadcrumbs(breadcrumbs, params),
    getBreadcrumbs$: () => projectNavigation.getProjectBreadcrumbs$(),
    getActiveNavigationNodes$: () => projectNavigation.getActiveNodes$(),
    updateSolutionNavigations: projectNavigation.updateSolutionNavigations,
    changeActiveSolutionNavigation: projectNavigation.changeActiveSolutionNavigation,
  };

  return {
    // Component factories (deprecated)
    getClassicHeaderComponent: components.getClassicHeader,
    getProjectHeaderComponent: components.getProjectHeader,
    getProjectSideNavComponent: components.getProjectSideNav,
    getHeaderBanner: components.getHeaderBanner,
    getChromelessHeader: components.getChromelessHeader,
    getProjectAppMenuComponent: components.getProjectAppMenu,
    getSidebarComponent: components.getSidebar,
    withProvider: (children: ReactNode) => {
      return <SidebarServiceProvider value={{ sidebar }}>{children}</SidebarServiceProvider>;
    },

    // Sub-services
    navControls: services.navControls,
    navLinks: services.navLinks,
    recentlyAccessed: services.recentlyAccessed,
    docTitle: services.docTitle,

    // Visibility
    getIsVisible$: () => state.visibility.isVisible$,
    setIsVisible: state.visibility.setIsVisible,

    // Badge
    getBadge$: () => state.badge.$,
    setBadge: state.badge.set,

    // Footer
    getGlobalFooter$: () => state.globalFooter.$,
    setGlobalFooter: state.globalFooter.set,

    // Breadcrumbs
    getBreadcrumbs$: () => state.breadcrumbs.classic.$,
    setBreadcrumbs: (newBreadcrumbs, params = {}) => {
      state.breadcrumbs.classic.set(newBreadcrumbs);
      if (params.project) {
        const { value: projectValue, absolute = false } = params.project;
        project.setBreadcrumbs(projectValue ?? [], { absolute });
      }
    },
    getBreadcrumbsAppendExtensions$: () => state.breadcrumbs.appendExtensions.$,
    setBreadcrumbsAppendExtension: (extension) => {
      state.breadcrumbs.appendExtensions.addSorted(
        extension,
        ({ order: orderA = 50 }, { order: orderB = 50 }) => orderA - orderB
      );
      return () => {
        state.breadcrumbs.appendExtensions.remove((ext) => ext === extension);
      };
    },
    setBreadcrumbsBadges: (badges) => state.breadcrumbs.badges.set(badges),

    // App Menu
    getAppMenu$: () => state.appMenu.$,
    setAppMenu: state.appMenu.set,

    // Help
    getHelpExtension$: () => state.help.extension.$,
    setHelpExtension: state.help.extension.set,
    getHelpSupportUrl$: () => state.help.supportUrl.$,
    setHelpSupportUrl: state.help.supportUrl.set,
    getGlobalHelpExtensionMenuLinks$: () => state.help.globalMenuLinks.$,
    registerGlobalHelpExtensionMenuLink: (link) => state.help.globalMenuLinks.add(link),
    setHelpMenuLinks: services.navControls.setHelpMenuLinks,

    // Custom Nav Link
    getCustomNavLink$: () => state.customNavLink.$,
    setCustomNavLink: state.customNavLink.set,

    // Header Banner
    setHeaderBanner: state.headerBanner.set,
    hasHeaderBanner$: () => state.headerBanner.$.pipe(map((banner) => Boolean(banner))),

    // Chrome Style
    setChromeStyle: state.style.setChromeStyle,
    getChromeStyle$: () => state.style.chromeStyle$,

    // Side Nav
    sideNav: {
      getIsCollapsed$: () => state.sideNav.collapsed.$,
      setIsCollapsed: state.sideNav.collapsed.set,
    },

    // Project Navigation
    getActiveSolutionNavId$: () =>
      projectNavigation.getActiveSolutionNavId$() as ReturnType<
        InternalChromeStart['getActiveSolutionNavId$']
      >,
    project,
    sidebar,
  };
}
