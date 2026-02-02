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
import { Header, LoadingIndicator, ProjectHeader } from '.';
import { HeaderTopBanner } from './header/header_top_banner';
import { AppMenuBar } from './project/app_menu';
import { GridLayoutProjectSideNav } from './project/sidenav/grid_layout_sidenav';
import type { NavigationProps } from './project/sidenav/types';
import type { ChromeState } from '../state/chrome_state';

export interface ChromeComponentsDeps {
  isServerless: boolean;
  application: InternalApplicationStart;
  basePath: InternalHttpStart['basePath'];
  docLinks: DocLinksStart;
  kibanaVersion: string;
  state: ChromeState;
  loadingCount$: Observable<number>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  forceAppSwitcherNavigation$: Observable<boolean>;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<RecentlyAccessedHistoryItem[]>;
  navControlsLeft$: Observable<ChromeNavControl[]>;
  navControlsCenter$: Observable<ChromeNavControl[]>;
  navControlsRight$: Observable<ChromeNavControl[]>;
  navControlsExtension$: Observable<ChromeNavControl[]>;
  customBranding$: CustomBrandingStart['customBranding$'];
  appMenuActions$: InternalApplicationStart['currentActionMenu$'];
  projectBreadcrumbs$: Observable<ChromeBreadcrumb[]>;
  projectHomeHref$: Observable<string>;
  prependBasePath: InternalHttpStart['basePath']['prepend'];
  reportEvent: (eventType: string, eventData: object) => void;
  navigationTree$: Observable<NavigationTreeDefinitionUI>;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;
  activeDataTestSubj$?: Observable<string | undefined>;
  homeHref: string;
  kibanaDocLink: string;
}

export const createChromeComponents = ({
  isServerless,
  application,
  basePath,
  docLinks,
  kibanaVersion,
  state,
  loadingCount$,
  helpMenuLinks$,
  forceAppSwitcherNavigation$,
  navLinks$,
  recentlyAccessed$,
  navControlsLeft$,
  navControlsCenter$,
  navControlsRight$,
  navControlsExtension$,
  customBranding$,
  appMenuActions$,
  projectBreadcrumbs$,
  projectHomeHref$,
  prependBasePath,
  reportEvent,
  navigationTree$,
  activeNodes$,
  activeDataTestSubj$,
  homeHref,
  kibanaDocLink,
}: ChromeComponentsDeps) => {
  const getClassicHeader = () => (
    <Header
      isServerless={isServerless}
      loadingCount$={loadingCount$}
      application={application}
      badge$={state.badge.$}
      basePath={basePath}
      breadcrumbs$={state.breadcrumbs.classic.$}
      breadcrumbsAppendExtensions$={state.breadcrumbs.appendExtensionsWithBadges$}
      customNavLink$={state.customNavLink.$}
      kibanaDocLink={kibanaDocLink}
      docLinks={docLinks}
      forceAppSwitcherNavigation$={forceAppSwitcherNavigation$}
      globalHelpExtensionMenuLinks$={state.help.globalMenuLinks.$}
      helpExtension$={state.help.extension.$}
      helpSupportUrl$={state.help.supportUrl.$}
      helpMenuLinks$={helpMenuLinks$}
      homeHref={homeHref}
      kibanaVersion={kibanaVersion}
      navLinks$={navLinks$}
      recentlyAccessed$={recentlyAccessed$}
      navControlsLeft$={navControlsLeft$}
      navControlsCenter$={navControlsCenter$}
      navControlsRight$={navControlsRight$}
      navControlsExtension$={navControlsExtension$}
      customBranding$={customBranding$}
      appMenu$={state.appMenu.$}
    />
  );

  const getProjectHeader = () => (
    <ProjectHeader
      isServerless={isServerless}
      application={application}
      globalHelpExtensionMenuLinks$={state.help.globalMenuLinks.$}
      breadcrumbs$={projectBreadcrumbs$}
      breadcrumbsAppendExtensions$={state.breadcrumbs.appendExtensionsWithBadges$}
      customBranding$={customBranding$}
      helpExtension$={state.help.extension.$}
      helpSupportUrl$={state.help.supportUrl.$}
      helpMenuLinks$={helpMenuLinks$}
      navControlsLeft$={navControlsLeft$}
      navControlsCenter$={navControlsCenter$}
      navControlsRight$={navControlsRight$}
      loadingCount$={loadingCount$}
      homeHref$={projectHomeHref$}
      docLinks={docLinks}
      kibanaVersion={kibanaVersion}
      prependBasePath={prependBasePath}
    />
  );

  const getProjectSideNav = () => {
    const navProps: NavigationProps = {
      basePath,
      application,
      reportEvent,
      navigationTree$,
      activeNodes$,
      navLinks$,
      dataTestSubj$: activeDataTestSubj$,
      feedbackUrlParams$: state.feedback.feedbackUrlParams$,
      onToggleCollapsed: state.sideNav.setIsCollapsed,
      isFeedbackEnabled$: state.feedback.isFeedbackEnabled$,
    };

    return (
      <GridLayoutProjectSideNav
        isCollapsed$={state.sideNav.isCollapsed$}
        initialIsCollapsed={state.sideNav.getIsCollapsed()}
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

  return {
    getClassicHeader,
    getProjectHeader,
    getProjectSideNav,
    getHeaderBanner,
    getChromelessHeader,
    getProjectAppMenu,
  };
};
