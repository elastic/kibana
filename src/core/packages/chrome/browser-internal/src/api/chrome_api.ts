/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';
import type { RecentlyAccessedService } from '@kbn/recently-accessed';
import type { InternalChromeStart } from '../types';
import type { ChromeState } from '../state/chrome_state';
import type { NavControlsService } from '../services/nav_controls';
import type { NavLinksService } from '../services/nav_links';
import type { ProjectNavigationService } from '../services/project_navigation';
import type { DocTitleService } from '../services/doc_title';
import { createBreadcrumbsApi } from './breadcrumbs_api';
import { createHelpApi } from './help_api';
import { createProjectApi } from './project_api';

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
}

export function createChromeApi({
  state,
  services,
  components,
}: ChromeApiDeps): InternalChromeStart {
  const projectApi = createProjectApi({
    projectNavigation: services.projectNavigation,
    chromeStyle: state.style.chromeStyle,
  });

  const breadcrumbsApi = createBreadcrumbsApi({
    state,
    setProjectBreadcrumbs: projectApi.setBreadcrumbs,
  });

  const helpApi = createHelpApi({
    state,
    setHelpMenuLinks: services.navControls.setHelpMenuLinks,
  });

  return {
    // Component factories (deprecated)
    getClassicHeaderComponent: components.getClassicHeader,
    getProjectHeaderComponent: components.getProjectHeader,
    getProjectSideNavComponent: components.getProjectSideNav,
    getHeaderBanner: components.getHeaderBanner,
    getChromelessHeader: components.getChromelessHeader,
    getProjectAppMenuComponent: components.getProjectAppMenu,

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
    ...breadcrumbsApi,

    // App Menu
    getAppMenu$: () => state.appMenu.$,
    setAppMenu: state.appMenu.set,

    // Help
    ...helpApi,

    // Custom Nav Link
    getCustomNavLink$: () => state.customNavLink.$,
    setCustomNavLink: state.customNavLink.set,

    // Header Banner
    setHeaderBanner: state.headerBanner.set,
    hasHeaderBanner$: () => state.headerBanner.$.pipe(map((banner) => Boolean(banner))),

    // Chrome Style
    getBodyClasses$: () => state.bodyClasses$,
    setChromeStyle: state.style.setChromeStyle,
    getChromeStyle$: () => state.style.chromeStyle$,

    // Side Nav
    sideNav: {
      getIsCollapsed$: () => state.sideNav.isCollapsed$,
      setIsCollapsed: state.sideNav.setIsCollapsed,
      getIsFeedbackBtnVisible$: () => state.feedback.isFeedbackBtnVisible$,
      setIsFeedbackBtnVisible: state.feedback.setIsFeedbackBtnVisible,
    },

    // Project Navigation
    getActiveSolutionNavId$: () =>
      services.projectNavigation.getActiveSolutionNavId$() as ReturnType<
        InternalChromeStart['getActiveSolutionNavId$']
      >,
    project: projectApi,
  };
}
