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
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type {
  ChromeBreadcrumb,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import { Header, LoadingIndicator, ProjectHeader, Sidebar } from '.';
import { HeaderTopBanner } from './header/header_top_banner';
import { AppMenuBar } from './project/app_menu';
import { GridLayoutProjectSideNav } from './project/sidenav/grid_layout_sidenav';
import type { NavigationProps } from './project/sidenav/types';
import type { ChromeState } from '../state/chrome_state';

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
  state: ChromeState;
  application: InternalApplicationStart;
  basePath: InternalHttpStart['basePath'];
  docLinks: DocLinksStart;
  navControls: NavControlsObservables;
  projectNavigation: ProjectNavigationObservables;
  loadingCount$: Observable<number>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<RecentlyAccessedHistoryItem[]>;
  customBranding$: CustomBrandingStart['customBranding$'];
  appMenuActions$: InternalApplicationStart['currentActionMenu$'];
  prependBasePath: InternalHttpStart['basePath']['prepend'];
}

export const createChromeComponents = ({
  config,
  application,
  basePath,
  docLinks,
  state,
  loadingCount$,
  helpMenuLinks$,
  navLinks$,
  recentlyAccessed$,
  navControls,
  customBranding$,
  appMenuActions$,
  projectNavigation,
  prependBasePath,
}: ChromeComponentsDeps) => {
  const getClassicHeader = () => (
    <Header
      isServerless={config.isServerless}
      loadingCount$={loadingCount$}
      application={application}
      badge$={state.badge.$}
      basePath={basePath}
      breadcrumbs$={state.breadcrumbs.classic.$}
      breadcrumbsAppendExtensions$={state.breadcrumbs.appendExtensionsWithBadges$}
      customNavLink$={state.customNavLink.$}
      kibanaDocLink={config.kibanaDocLink}
      docLinks={docLinks}
      globalHelpExtensionMenuLinks$={state.help.globalMenuLinks.$}
      helpExtension$={state.help.extension.$}
      helpSupportUrl$={state.help.supportUrl.$}
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
      appMenu$={state.appMenu.$}
    />
  );

  const getProjectHeader = () => (
    <ProjectHeader
      isServerless={config.isServerless}
      application={application}
      globalHelpExtensionMenuLinks$={state.help.globalMenuLinks.$}
      breadcrumbs$={projectNavigation.breadcrumbs$}
      breadcrumbsAppendExtensions$={state.breadcrumbs.appendExtensionsWithBadges$}
      customBranding$={customBranding$}
      helpExtension$={state.help.extension.$}
      helpSupportUrl$={state.help.supportUrl.$}
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
      onToggleCollapsed: state.sideNav.collapsed.set,
    };

    return (
      <GridLayoutProjectSideNav
        isCollapsed$={state.sideNav.collapsed.subject$}
        navProps={navProps}
      />
    );
  };

  const getHeaderBanner = () => {
    return <HeaderTopBanner headerBanner$={state.headerBanner.$} position={'static'} />;
  };

  const getChromelessHeader = () => {
    return (
      <div data-test-subj="kibanaHeaderChromeless">
        <LoadingIndicator loadingCount$={loadingCount$} showAsBar />
      </div>
    );
  };

  const getProjectAppMenu = () => {
    return <AppMenuBar appMenuActions$={appMenuActions$} appMenu$={state.appMenu.$} />;
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
