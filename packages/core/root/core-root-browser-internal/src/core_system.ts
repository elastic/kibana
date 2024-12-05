/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, firstValueFrom } from 'rxjs';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import {
  InjectedMetadataService,
  type InjectedMetadataParams,
} from '@kbn/core-injected-metadata-browser-internal';
import { BrowserLoggingSystem } from '@kbn/core-logging-browser-internal';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
import { ThemeService } from '@kbn/core-theme-browser-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { AnalyticsService } from '@kbn/core-analytics-browser-internal';
import { I18nService } from '@kbn/core-i18n-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import { FatalErrorsService } from '@kbn/core-fatal-errors-browser-internal';
import { FeatureFlagsService } from '@kbn/core-feature-flags-browser-internal';
import { HttpService } from '@kbn/core-http-browser-internal';
import { SettingsService, UiSettingsService } from '@kbn/core-ui-settings-browser-internal';
import { DeprecationsService } from '@kbn/core-deprecations-browser-internal';
import { IntegrationsService } from '@kbn/core-integrations-browser-internal';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { OverlayService } from '@kbn/core-overlays-browser-internal';
import { SavedObjectsService } from '@kbn/core-saved-objects-browser-internal';
import { NotificationsService } from '@kbn/core-notifications-browser-internal';
import { ChromeService } from '@kbn/core-chrome-browser-internal';
import { ApplicationService } from '@kbn/core-application-browser-internal';
import { RenderingService } from '@kbn/core-rendering-browser-internal';
import { CoreAppsService } from '@kbn/core-apps-browser-internal';
import type { InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-browser-internal';
import { PluginsService } from '@kbn/core-plugins-browser-internal';
import { CustomBrandingService } from '@kbn/core-custom-branding-browser-internal';
import { SecurityService } from '@kbn/core-security-browser-internal';
import { UserProfileService } from '@kbn/core-user-profile-browser-internal';
import { KBN_LOAD_MARKS } from './events';
import { fetchOptionalMemoryInfo } from './fetch_optional_memory_info';
import {
  LOAD_SETUP_DONE,
  LOAD_START_DONE,
  KIBANA_LOADED_EVENT,
  LOAD_CORE_CREATED,
  LOAD_FIRST_NAV,
  LOAD_BOOTSTRAP_START,
  LOAD_START,
} from './events';

import './core_system.scss';

/**
 * @internal
 */
export interface CoreSystemParams {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
}

// Expands the definition of navigator to include experimental features
interface ExtendedNavigator {
  connection?: {
    effectiveType?: string;
  };
  // Estimated RAM
  deviceMemory?: number;
  // Number of cores
  hardwareConcurrency?: number;
}

/**
 * The CoreSystem is the root of the new platform, and setups all parts
 * of Kibana in the UI, including the LegacyPlatform which is managed
 * by the LegacyPlatformService. As we migrate more things to the new
 * platform the CoreSystem will get many more Services.
 *
 * @internal
 */
export class CoreSystem {
  private readonly loggingSystem: BrowserLoggingSystem;
  private readonly analytics: AnalyticsService;
  private readonly fatalErrors: FatalErrorsService;
  private readonly featureFlags: FeatureFlagsService;
  private readonly injectedMetadata: InjectedMetadataService;
  private readonly notifications: NotificationsService;
  private readonly http: HttpService;
  private readonly savedObjects: SavedObjectsService;
  private readonly uiSettings: UiSettingsService;
  private readonly settings: SettingsService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;
  private readonly overlay: OverlayService;
  private readonly plugins: PluginsService;
  private readonly application: ApplicationService;
  private readonly docLinks: DocLinksService;
  private readonly rendering: RenderingService;
  private readonly integrations: IntegrationsService;
  private readonly coreApp: CoreAppsService;
  private readonly deprecations: DeprecationsService;
  private readonly theme: ThemeService;
  private readonly rootDomElement: HTMLElement;
  private readonly coreContext: CoreContext;
  private readonly executionContext: ExecutionContextService;
  private readonly customBranding: CustomBrandingService;
  private readonly security: SecurityService;
  private readonly userProfile: UserProfileService;
  private fatalErrorsSetup: FatalErrorsSetup | null = null;

  constructor(params: CoreSystemParams) {
    const { rootDomElement, browserSupportsCsp, injectedMetadata } = params;

    this.rootDomElement = rootDomElement;

    this.loggingSystem = new BrowserLoggingSystem(injectedMetadata.logging);

    this.injectedMetadata = new InjectedMetadataService({
      injectedMetadata,
    });
    this.coreContext = {
      coreId: Symbol('core'),
      env: injectedMetadata.env,
      logger: this.loggingSystem.asLoggerFactory(),
    };

    this.i18n = new I18nService();
    this.analytics = new AnalyticsService(this.coreContext);
    this.fatalErrors = new FatalErrorsService(rootDomElement, () => {
      // Stop Core before rendering any fatal errors into the DOM
      this.stop();
    });
    this.featureFlags = new FeatureFlagsService(this.coreContext);
    this.security = new SecurityService(this.coreContext);
    this.userProfile = new UserProfileService(this.coreContext);
    this.theme = new ThemeService();
    this.notifications = new NotificationsService();
    this.http = new HttpService();
    this.savedObjects = new SavedObjectsService();
    this.uiSettings = new UiSettingsService();
    this.settings = new SettingsService();
    this.overlay = new OverlayService();
    this.chrome = new ChromeService({
      browserSupportsCsp,
      kibanaVersion: injectedMetadata.version,
      coreContext: this.coreContext,
    });
    this.docLinks = new DocLinksService(this.coreContext);
    this.rendering = new RenderingService();
    this.application = new ApplicationService();
    this.integrations = new IntegrationsService();
    this.deprecations = new DeprecationsService();
    this.executionContext = new ExecutionContextService();
    this.plugins = new PluginsService(this.coreContext, injectedMetadata.uiPlugins);
    this.coreApp = new CoreAppsService(this.coreContext);
    this.customBranding = new CustomBrandingService();

    performance.mark(KBN_LOAD_MARKS, {
      detail: LOAD_CORE_CREATED,
    });
  }

  private getLoadMarksInfo(): Record<string, number> {
    if (!performance) return {};
    const reportData: Record<string, number> = {};
    const marks = performance.getEntriesByName(KBN_LOAD_MARKS);
    for (const mark of marks) {
      reportData[(mark as PerformanceMark).detail] = mark.startTime;
    }

    return reportData;
  }

  private reportKibanaLoadedEvent(analytics: AnalyticsServiceStart) {
    /**
     * @deprecated here for backwards compatibility in FullStory
     **/
    analytics.reportEvent('Loaded Kibana', {
      kibana_version: this.coreContext.env.packageInfo.version,
      protocol: window.location.protocol,
    });

    const timing = this.getLoadMarksInfo();

    const navigatorExt = navigator as ExtendedNavigator;
    const navigatorInfo: Record<string, string> = {};
    if (navigatorExt.deviceMemory) {
      navigatorInfo.deviceMemory = String(navigatorExt.deviceMemory);
    }
    if (navigatorExt.hardwareConcurrency) {
      navigatorInfo.hardwareConcurrency = String(navigatorExt.hardwareConcurrency);
    }

    reportPerformanceMetricEvent(analytics, {
      eventName: KIBANA_LOADED_EVENT,
      meta: {
        kibana_version: this.coreContext.env.packageInfo.version,
        protocol: window.location.protocol,
        ...fetchOptionalMemoryInfo(),
        // Report some hardware metrics for bucketing
        ...navigatorInfo,
      },
      duration: timing[LOAD_FIRST_NAV],
      key1: LOAD_START,
      value1: timing[LOAD_START],
      key2: LOAD_BOOTSTRAP_START,
      value2: timing[LOAD_BOOTSTRAP_START],
      key3: LOAD_CORE_CREATED,
      value3: timing[LOAD_CORE_CREATED],
      key4: LOAD_SETUP_DONE,
      value4: timing[LOAD_SETUP_DONE],
      key5: LOAD_START_DONE,
      value5: timing[LOAD_START_DONE],
    });
    performance.clearMarks(KBN_LOAD_MARKS);
  }

  public async setup() {
    try {
      // Setup FatalErrorsService and it's dependencies first so that we're
      // able to render any errors.
      const injectedMetadata = this.injectedMetadata.setup();
      const analytics = this.analytics.setup({ injectedMetadata });
      const theme = this.theme.setup({ injectedMetadata });

      this.fatalErrorsSetup = this.fatalErrors.setup({
        injectedMetadata,
        analytics,
        theme,
        i18n: this.i18n.getContext(),
      });
      await this.integrations.setup();
      this.docLinks.setup();

      this.registerLoadedKibanaEventType(analytics);

      const executionContext = this.executionContext.setup({ analytics });
      const http = this.http.setup({
        injectedMetadata,
        fatalErrors: this.fatalErrorsSetup,
        executionContext,
      });
      const security = this.security.setup();
      const userProfile = this.userProfile.setup();
      this.chrome.setup({ analytics });
      const uiSettings = this.uiSettings.setup({ http, injectedMetadata });
      const settings = this.settings.setup({ http, injectedMetadata });
      const notifications = this.notifications.setup({ uiSettings, analytics });
      const customBranding = this.customBranding.setup({ injectedMetadata });

      const application = this.application.setup({ http, analytics });
      this.coreApp.setup({ application, http, injectedMetadata, notifications });
      const featureFlags = this.featureFlags.setup({ injectedMetadata });

      const core: InternalCoreSetup = {
        analytics,
        application,
        fatalErrors: this.fatalErrorsSetup,
        featureFlags,
        http,
        injectedMetadata,
        notifications,
        theme,
        uiSettings,
        settings,
        executionContext,
        customBranding,
        security,
        userProfile,
      };

      // Services that do not expose contracts at setup
      await this.plugins.setup(core);

      performance.mark(KBN_LOAD_MARKS, {
        detail: LOAD_SETUP_DONE,
      });

      return { fatalErrors: this.fatalErrorsSetup };
    } catch (error) {
      if (this.fatalErrorsSetup) {
        this.fatalErrorsSetup.add(error);
      } else {
        // If the FatalErrorsService has not yet been setup, log error to console
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }
  }

  public async start() {
    try {
      const analytics = this.analytics.start();
      const security = this.security.start();
      const userProfile = this.userProfile.start();
      const injectedMetadata = this.injectedMetadata.start();
      const uiSettings = this.uiSettings.start();
      const settings = this.settings.start();
      const docLinks = this.docLinks.start({ injectedMetadata });
      const http = this.http.start();
      const savedObjects = await this.savedObjects.start({ http });
      const i18n = this.i18n.start();
      const fatalErrors = this.fatalErrors.start();
      const theme = this.theme.start();
      await this.integrations.start({ uiSettings });

      const coreUiTargetDomElement = document.createElement('div');
      coreUiTargetDomElement.id = 'kibana-body';
      coreUiTargetDomElement.dataset.testSubj = 'kibanaChrome';
      const notificationsTargetDomElement = document.createElement('div');
      const overlayTargetDomElement = document.createElement('div');

      const overlays = this.overlay.start({
        i18n,
        analytics,
        theme,
        uiSettings,
        userProfile,
        targetDomElement: overlayTargetDomElement,
      });
      const notifications = this.notifications.start({
        analytics,
        i18n,
        overlays,
        theme,
        userProfile,
        targetDomElement: notificationsTargetDomElement,
      });
      const customBranding = this.customBranding.start();
      const application = await this.application.start({
        http,
        theme,
        overlays,
        customBranding,
        analytics,
      });

      const executionContext = this.executionContext.start({
        curApp$: application.currentAppId$,
      });

      const chrome = await this.chrome.start({
        application,
        docLinks,
        http,
        injectedMetadata,
        notifications,
        customBranding,
      });
      const deprecations = this.deprecations.start({ http });

      this.coreApp.start({
        application,
        docLinks,
        http,
        notifications,
        uiSettings,
        analytics,
        i18n,
        theme,
        userProfile,
      });

      const featureFlags = await this.featureFlags.start();

      const core: InternalCoreStart = {
        analytics,
        application,
        chrome,
        docLinks,
        executionContext,
        featureFlags,
        http,
        theme,
        savedObjects,
        i18n,
        injectedMetadata,
        notifications,
        overlays,
        uiSettings,
        settings,
        fatalErrors,
        deprecations,
        customBranding,
        security,
        userProfile,
      };

      await this.plugins.start(core);

      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(coreUiTargetDomElement);
      this.rootDomElement.appendChild(notificationsTargetDomElement);
      this.rootDomElement.appendChild(overlayTargetDomElement);

      this.rendering.start({
        application,
        chrome,
        analytics,
        i18n,
        overlays,
        theme,
        targetDomElement: coreUiTargetDomElement,
        userProfile,
      });

      performance.mark(KBN_LOAD_MARKS, {
        detail: LOAD_START_DONE,
      });

      // Wait for the first app navigation to report Kibana Loaded
      firstValueFrom(application.currentAppId$.pipe(filter(Boolean))).then(() => {
        performance.mark(KBN_LOAD_MARKS, {
          detail: LOAD_FIRST_NAV,
        });
        this.reportKibanaLoadedEvent(analytics);
      });

      return {
        application,
        executionContext,
      };
    } catch (error) {
      if (this.fatalErrorsSetup) {
        this.fatalErrorsSetup.add(error);
      } else {
        // If the FatalErrorsService has not yet been setup, log error to console
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  }

  public stop() {
    this.plugins.stop();
    this.coreApp.stop();
    this.notifications.stop();
    this.http.stop();
    this.integrations.stop();
    this.uiSettings.stop();
    this.settings.stop();
    this.chrome.stop();
    this.i18n.stop();
    this.application.stop();
    this.deprecations.stop();
    this.theme.stop();
    this.analytics.stop();
    this.featureFlags.stop();
    this.security.stop();
    this.userProfile.stop();
    this.rootDomElement.textContent = '';
  }

  /**
   * @deprecated
   */
  private registerLoadedKibanaEventType(analytics: AnalyticsServiceSetup) {
    analytics.registerEventType({
      eventType: 'Loaded Kibana',
      schema: {
        kibana_version: {
          type: 'keyword',
          _meta: { description: 'The version of Kibana' },
        },
        protocol: {
          type: 'keyword',
          _meta: {
            description: 'Value from window.location.protocol',
          },
        },
      },
    });
  }
}
