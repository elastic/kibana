/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defer, from, ReplaySubject } from 'rxjs';

import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import { RecentlyAccessedService } from '@kbn/recently-accessed';
import type { Logger } from '@kbn/logging';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

import { DocTitleService } from './services/doc_title';
import { NavControlsService } from './services/nav_controls';
import { NavLinksService } from './services/nav_links';
import { ProjectNavigationService } from './services/project_navigation';
import { createChromeComponents } from './ui/chrome_components';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';
import type { InternalChromeSetup, InternalChromeStart } from './types';
import { createChromeState } from './state';
import {
  setupChromeSideEffects,
  showCspWarningIfNeeded,
  setupAppChangeHandler,
} from './side_effects';
import { createChromeApi } from './chrome_api';

interface ConstructorParams {
  browserSupportsCsp: boolean;
  kibanaVersion: string;
  basePath: string;
  coreContext: CoreContext;
}

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}

export interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: InternalHttpStart;
  injectedMetadata: InternalInjectedMetadataStart;
  getNotifications: () => Promise<NotificationsStart>;
  customBranding: CustomBrandingStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  uiSettings: IUiSettingsClient;
  analytics: AnalyticsServiceStart;
  featureFlags: FeatureFlagsStart;
}

/** @internal */
export class ChromeService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly navControls = new NavControlsService();
  private readonly navLinks = new NavLinksService();
  private readonly recentlyAccessed = new RecentlyAccessedService();
  private readonly docTitle = new DocTitleService();
  private readonly projectNavigation: ProjectNavigationService;
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor(private readonly params: ConstructorParams) {
    this.logger = params.coreContext.logger.get('chrome-browser');
    this.isServerless = params.coreContext.env.packageInfo.buildFlavor === 'serverless';
    this.projectNavigation = new ProjectNavigationService(this.isServerless);
  }

  public setup({ analytics }: SetupDeps): InternalChromeSetup {
    const docTitle = this.docTitle.setup({ document: window.document });
    registerAnalyticsContextProvider(analytics, docTitle.title$);

    return {};
  }

  public async start({
    application,
    docLinks,
    http,
    injectedMetadata,
    getNotifications,
    customBranding,
    i18n,
    theme,
    userProfile,
    uiSettings,
    analytics,
    featureFlags,
  }: StartDeps): Promise<InternalChromeStart> {
    // 1. Create all chrome state
    const state = createChromeState({
      application,
      kibanaVersion: this.params.kibanaVersion,
      docLinks,
      feedbackDeps: {
        isEnabled$: defer(() =>
          from(getNotifications().then((notifications) => notifications.feedback.isEnabled()))
        ),
        urlParams$: defer(() => projectNavigation.getFeedbackUrlParams$()),
      },
    });

    // 2. Setup side effects (fullscreen changes, system color mode)
    setupChromeSideEffects({
      visibility: state.visibility,
      stop$: this.stop$,
      getNotifications,
      i18n,
      theme,
      userProfile,
      http,
      uiSettings,
    });

    // 3. Show CSP warning if needed
    showCspWarningIfNeeded({
      browserSupportsCsp: this.params.browserSupportsCsp,
      warnLegacyBrowsers: injectedMetadata.getCspConfig().warnLegacyBrowsers,
      getNotifications,
    });

    // 4. Start sub-services
    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const recentlyAccessed = this.recentlyAccessed.start({ http, key: 'recentlyAccessed' });
    const docTitle = this.docTitle.start();
    const projectNavigation = this.projectNavigation.start({
      application,
      navLinksService: navLinks,
      http,
      chromeBreadcrumbs$: state.breadcrumbs.classic.$,
      logger: this.logger,
      featureFlags,
      uiSettings,
    });

    // 5. Setup app change handler (resets chrome state on app navigation)
    setupAppChangeHandler({
      currentAppId$: application.currentAppId$,
      stop$: this.stop$,
      state,
      docTitle,
    });

    // 6. Create cached observables for components
    const navLinks$ = navLinks.getNavLinks$();
    const activeNodes$ = projectNavigation.getActiveNodes$();
    const navigationTreeUi$ = projectNavigation.getNavigationTreeUi$();
    const loadingCount$ = http.getLoadingCount$();
    const recentlyAccessed$ = recentlyAccessed.get$();
    const activeDataTestSubj$ = projectNavigation.getActiveDataTestSubj$();
    const helpMenuLinks$ = navControls.getHelpMenuLinks$();
    const homeHref = http.basePath.prepend('/app/home');
    const kibanaVersion = this.params.kibanaVersion;

    // 7. Create chrome components
    const components = createChromeComponents({
      isServerless: this.isServerless,
      application,
      basePath: http.basePath,
      docLinks,
      kibanaVersion,
      state,
      loadingCount$,
      helpMenuLinks$,
      forceAppSwitcherNavigation$: navLinks.getForceAppSwitcherNavigation$(),
      navLinks$,
      recentlyAccessed$,
      navControlsLeft$: navControls.getLeft$(),
      navControlsCenter$: navControls.getCenter$(),
      navControlsRight$: navControls.getRight$(),
      navControlsExtension$: navControls.getExtension$(),
      customBranding$: customBranding.customBranding$,
      appMenuActions$: application.currentActionMenu$,
      projectBreadcrumbs$: projectNavigation.getProjectBreadcrumbs$(),
      projectHomeHref$: projectNavigation.getProjectHome$(),
      prependBasePath: http.basePath.prepend,
      reportEvent: analytics.reportEvent,
      navigationTree$: navigationTreeUi$,
      activeNodes$,
      activeDataTestSubj$,
      homeHref,
      kibanaDocLink: docLinks.links.kibana.guide,
    });

    // 8. Return chrome API
    return createChromeApi({
      state,
      services: {
        navControls,
        navLinks,
        recentlyAccessed,
        docTitle,
        projectNavigation,
      },
      components,
    });
  }

  public stop() {
    this.navLinks.stop();
    this.projectNavigation.stop();
    this.stop$.next();
  }
}
