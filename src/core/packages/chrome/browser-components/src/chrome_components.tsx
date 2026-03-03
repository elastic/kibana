/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Observable } from 'rxjs';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  ChromeUserBanner,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import { Header } from './classic';
import { ProjectHeader } from './project';
import { Sidebar } from './sidebar';
import { LoadingIndicator, HeaderTopBanner } from './shared';
import { AppMenuBar } from './project/app_menu';
import { GridLayoutProjectSideNav } from './project/sidenav/grid_layout_sidenav';
import type { NavigationProps } from './project/sidenav/types';

interface ChromeComponentsConfig {
  isServerless: boolean;
  kibanaVersion: string;
  homeHref: string;
  kibanaDocLink: string;
}

interface NavControlsObservables {
  left$: Observable<ChromeNavControl[]>;
  center$: Observable<ChromeNavControl[]>;
  right$: Observable<ChromeNavControl[]>;
  extension$: Observable<ChromeNavControl[]>;
}

interface ProjectNavigationObservables {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  homeHref$: Observable<string>;
  navigationTree$: Observable<NavigationTreeDefinitionUI>;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;
  activeDataTestSubj$?: Observable<string | undefined>;
}

export interface ChromeComponentsDeps {
  config: ChromeComponentsConfig;
  application: InternalApplicationStart;
  basePath: HttpStart['basePath'];
  docLinks: DocLinksStart;
  navControls: NavControlsObservables;
  projectNavigation: ProjectNavigationObservables;
  loadingCount$: Observable<number>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<RecentlyAccessedHistoryItem[]>;
  customBranding$: Observable<CustomBranding>;
  appMenuActions$: Observable<MountPoint<HTMLElement> | undefined>;
  prependBasePath: HttpStart['basePath']['prepend'];

  // State observables (replacing state: ChromeState)
  badge$: Observable<ChromeBadge | undefined>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtensions$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  customNavLink$: Observable<ChromeNavLink | undefined>;
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  appMenu$: Observable<AppMenuConfig | undefined>;
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  sideNavCollapsed$: Observable<boolean>;
  initialSideNavCollapsed: boolean;
  onToggleSideNavCollapsed: (collapsed: boolean) => void;
}

export const createChromeComponents = ({
  config,
  application,
  basePath,
  docLinks,
  loadingCount$,
  helpMenuLinks$,
  navLinks$,
  recentlyAccessed$,
  navControls,
  customBranding$,
  appMenuActions$,
  projectNavigation,
  prependBasePath,
  badge$,
  breadcrumbs$,
  breadcrumbsAppendExtensions$,
  customNavLink$,
  globalHelpExtensionMenuLinks$,
  helpExtension$,
  helpSupportUrl$,
  appMenu$,
  headerBanner$,
  sideNavCollapsed$,
  initialSideNavCollapsed,
  onToggleSideNavCollapsed,
}: ChromeComponentsDeps) => {
  const getClassicHeader = () => (
    <Header
      isServerless={config.isServerless}
      loadingCount$={loadingCount$}
      application={application}
      badge$={badge$}
      basePath={basePath}
      breadcrumbs$={breadcrumbs$}
      breadcrumbsAppendExtensions$={breadcrumbsAppendExtensions$}
      customNavLink$={customNavLink$}
      kibanaDocLink={config.kibanaDocLink}
      docLinks={docLinks}
      globalHelpExtensionMenuLinks$={globalHelpExtensionMenuLinks$}
      helpExtension$={helpExtension$}
      helpSupportUrl$={helpSupportUrl$}
      helpMenuLinks$={helpMenuLinks$}
      homeHref={config.homeHref}
      kibanaVersion={config.kibanaVersion}
      navLinks$={navLinks$}
      recentlyAccessed$={recentlyAccessed$}
      navControlsLeft$={navControls.left$}
      navControlsCenter$={navControls.center$}
      navControlsRight$={navControls.right$}
      navControlsExtension$={navControls.extension$}
      customBranding$={customBranding$}
      appMenu$={appMenu$}
    />
  );

  const getProjectHeader = () => (
    <ProjectHeader
      isServerless={config.isServerless}
      application={application}
      globalHelpExtensionMenuLinks$={globalHelpExtensionMenuLinks$}
      breadcrumbs$={projectNavigation.breadcrumbs$}
      breadcrumbsAppendExtensions$={breadcrumbsAppendExtensions$}
      customBranding$={customBranding$}
      helpExtension$={helpExtension$}
      helpSupportUrl$={helpSupportUrl$}
      helpMenuLinks$={helpMenuLinks$}
      navControlsLeft$={navControls.left$}
      navControlsCenter$={navControls.center$}
      navControlsRight$={navControls.right$}
      loadingCount$={loadingCount$}
      homeHref$={projectNavigation.homeHref$}
      docLinks={docLinks}
      kibanaVersion={config.kibanaVersion}
      prependBasePath={prependBasePath}
    />
  );

  const getProjectSideNav = () => {
    const navProps: NavigationProps = {
      basePath,
      application,
      navigationTree$: projectNavigation.navigationTree$,
      activeNodes$: projectNavigation.activeNodes$,
      navLinks$,
      dataTestSubj$: projectNavigation.activeDataTestSubj$,
      onToggleCollapsed: onToggleSideNavCollapsed,
    };

    return (
      <GridLayoutProjectSideNav
        isCollapsed$={sideNavCollapsed$}
        initialIsCollapsed={initialSideNavCollapsed}
        navProps={navProps}
      />
    );
  };

  const getHeaderBanner = () => {
    return <HeaderTopBanner headerBanner$={headerBanner$} position={'static'} />;
  };

  const getChromelessHeader = () => {
    return (
      <div data-test-subj="kibanaHeaderChromeless">
        <LoadingIndicator loadingCount$={loadingCount$} showAsBar />
      </div>
    );
  };

  const getProjectAppMenu = () => {
    return <AppMenuBar appMenuActions$={appMenuActions$} appMenu$={appMenu$} />;
  };

  const getSidebar = () => {
    return <Sidebar />;
  };

  return {
    getClassicHeader,
    getProjectHeader,
    getProjectSideNav,
    getHeaderBanner,
    getChromelessHeader,
    getProjectAppMenu,
    getSidebar,
  };
};
