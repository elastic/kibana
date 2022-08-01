/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filter, firstValueFrom } from 'rxjs';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import {
  InjectedMetadataService,
  type InjectedMetadataParams,
  type InternalInjectedMetadataSetup,
  type InternalInjectedMetadataStart,
} from '@kbn/core-injected-metadata-browser-internal';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
import { ThemeService } from '@kbn/core-theme-browser-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { AnalyticsService } from '@kbn/core-analytics-browser-internal';
import { I18nService } from '@kbn/core-i18n-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import { FatalErrorsService } from '@kbn/core-fatal-errors-browser-internal';
import { HttpService } from '@kbn/core-http-browser-internal';
import { UiSettingsService } from '@kbn/core-ui-settings-browser-internal';
import { DeprecationsService } from '@kbn/core-deprecations-browser-internal';
import { IntegrationsService } from '@kbn/core-integrations-browser-internal';
import { OverlayService } from '@kbn/core-overlays-browser-internal';
import { KBN_LOAD_MARKS } from '@kbn/core-mount-utils-browser-internal';
import { CoreSetup, CoreStart } from '.';
import { ChromeService } from './chrome';
import { NotificationsService } from './notifications';
import { PluginsService } from './plugins';
import { ApplicationService } from './application';
import { RenderingService } from './rendering';
import { SavedObjectsService } from './saved_objects';
import { CoreApp } from './core_app';
import type { InternalApplicationSetup, InternalApplicationStart } from './application/types';
import { fetchOptionalMemoryInfo } from './fetch_optional_memory_info';

interface Params {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
}

/** @internal */
export interface InternalCoreSetup extends Omit<CoreSetup, 'application' | 'getStartServices'> {
  application: InternalApplicationSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export interface InternalCoreStart extends Omit<CoreStart, 'application'> {
  application: InternalApplicationStart;
  injectedMetadata: InternalInjectedMetadataStart;
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
  private readonly analytics: AnalyticsService;
  private readonly fatalErrors: FatalErrorsService;
  private readonly injectedMetadata: InjectedMetadataService;
  private readonly notifications: NotificationsService;
  private readonly http: HttpService;
  private readonly savedObjects: SavedObjectsService;
  private readonly uiSettings: UiSettingsService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;
  private readonly overlay: OverlayService;
  private readonly plugins: PluginsService;
  private readonly application: ApplicationService;
  private readonly docLinks: DocLinksService;
  private readonly rendering: RenderingService;
  private readonly integrations: IntegrationsService;
  private readonly coreApp: CoreApp;
  private readonly deprecations: DeprecationsService;
  private readonly theme: ThemeService;
  private readonly rootDomElement: HTMLElement;
  private readonly coreContext: CoreContext;
  private readonly executionContext: ExecutionContextService;
  private fatalErrorsSetup: FatalErrorsSetup | null = null;

  constructor(params: Params) {
    const { rootDomElement, browserSupportsCsp, injectedMetadata } = params;

    this.rootDomElement = rootDomElement;

    this.i18n = new I18nService();

    this.injectedMetadata = new InjectedMetadataService({
      injectedMetadata,
    });
    this.coreContext = { coreId: Symbol('core'), env: injectedMetadata.env };

    this.analytics = new AnalyticsService(this.coreContext);

    this.fatalErrors = new FatalErrorsService(rootDomElement, () => {
      // Stop Core before rendering any fatal errors into the DOM
      this.stop();
    });

    this.theme = new ThemeService();
    this.notifications = new NotificationsService();
    this.http = new HttpService();
    this.savedObjects = new SavedObjectsService();
    this.uiSettings = new UiSettingsService();
    this.overlay = new OverlayService();
    this.chrome = new ChromeService({
      browserSupportsCsp,
      kibanaVersion: injectedMetadata.version,
    });
    this.docLinks = new DocLinksService();
    this.rendering = new RenderingService();
    this.application = new ApplicationService();
    this.integrations = new IntegrationsService();
    this.deprecations = new DeprecationsService();
    this.executionContext = new ExecutionContextService();

    this.plugins = new PluginsService(this.coreContext, injectedMetadata.uiPlugins);
    this.coreApp = new CoreApp(this.coreContext);

    performance.mark(KBN_LOAD_MARKS, {
      detail: 'core_created',
    });
  }

  private getLoadMarksInfo() {
    if (!performance) return [];
    const reportData: Record<string, number> = {};
    const marks = performance.getEntriesByName(KBN_LOAD_MARKS);
    for (const mark of marks) {
      reportData[(mark as PerformanceMark).detail] = mark.startTime;
    }

    return reportData;
  }

  private reportKibanaLoadedEvent(analytics: AnalyticsServiceStart) {
    analytics.reportEvent('Loaded Kibana', {
      kibana_version: this.coreContext.env.packageInfo.version,
      protocol: window.location.protocol,
      ...fetchOptionalMemoryInfo(),
      ...this.getLoadMarksInfo(),
    });
    performance.clearMarks(KBN_LOAD_MARKS);
  }

  public async setup() {
    try {
      // Setup FatalErrorsService and it's dependencies first so that we're
      // able to render any errors.
      const injectedMetadata = this.injectedMetadata.setup();
      const theme = this.theme.setup({ injectedMetadata });

      this.fatalErrorsSetup = this.fatalErrors.setup({
        injectedMetadata,
        theme,
        i18n: this.i18n.getContext(),
      });
      await this.integrations.setup();
      this.docLinks.setup();

      const analytics = this.analytics.setup({ injectedMetadata });
      this.registerLoadedKibanaEventType(analytics);

      const executionContext = this.executionContext.setup({ analytics });
      const http = this.http.setup({
        injectedMetadata,
        fatalErrors: this.fatalErrorsSetup,
        executionContext,
      });
      const uiSettings = this.uiSettings.setup({ http, injectedMetadata });
      const notifications = this.notifications.setup({ uiSettings });

      const application = this.application.setup({ http });
      this.coreApp.setup({ application, http, injectedMetadata, notifications });

      const core: InternalCoreSetup = {
        analytics,
        application,
        fatalErrors: this.fatalErrorsSetup,
        http,
        injectedMetadata,
        notifications,
        theme,
        uiSettings,
        executionContext,
      };

      // Services that do not expose contracts at setup
      await this.plugins.setup(core);

      performance.mark(KBN_LOAD_MARKS, {
        detail: 'setup_done',
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
      const injectedMetadata = await this.injectedMetadata.start();
      const uiSettings = await this.uiSettings.start();
      const docLinks = this.docLinks.start({ injectedMetadata });
      const http = await this.http.start();
      const savedObjects = await this.savedObjects.start({ http });
      const i18n = await this.i18n.start();
      const fatalErrors = await this.fatalErrors.start();
      const theme = this.theme.start();
      await this.integrations.start({ uiSettings });

      const coreUiTargetDomElement = document.createElement('div');
      coreUiTargetDomElement.id = 'kibana-body';
      coreUiTargetDomElement.dataset.testSubj = 'kibanaChrome';
      const notificationsTargetDomElement = document.createElement('div');
      const overlayTargetDomElement = document.createElement('div');

      const overlays = this.overlay.start({
        i18n,
        theme,
        uiSettings,
        targetDomElement: overlayTargetDomElement,
      });
      const notifications = await this.notifications.start({
        i18n,
        overlays,
        theme,
        targetDomElement: notificationsTargetDomElement,
      });
      const application = await this.application.start({ http, theme, overlays });

      const executionContext = this.executionContext.start({
        curApp$: application.currentAppId$,
      });

      const chrome = await this.chrome.start({
        application,
        docLinks,
        http,
        injectedMetadata,
        notifications,
      });
      const deprecations = this.deprecations.start({ http });

      this.coreApp.start({ application, docLinks, http, notifications, uiSettings });

      const core: InternalCoreStart = {
        analytics,
        application,
        chrome,
        docLinks,
        executionContext,
        http,
        theme,
        savedObjects,
        i18n,
        injectedMetadata,
        notifications,
        overlays,
        uiSettings,
        fatalErrors,
        deprecations,
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
        i18n,
        overlays,
        theme,
        targetDomElement: coreUiTargetDomElement,
      });

      performance.mark(KBN_LOAD_MARKS, {
        detail: 'start_done',
      });

      // Wait for the first app navigation to report Kibana Loaded
      firstValueFrom(application.currentAppId$.pipe(filter(Boolean))).then(() => {
        performance.mark(KBN_LOAD_MARKS, {
          detail: 'first_app_nav',
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
    this.chrome.stop();
    this.i18n.stop();
    this.application.stop();
    this.deprecations.stop();
    this.theme.stop();
    this.analytics.stop();
    this.rootDomElement.textContent = '';
  }

  private registerLoadedKibanaEventType(analytics: AnalyticsServiceSetup) {
    analytics.registerEventType({
      eventType: 'Loaded Kibana',
      schema: {
        kibana_version: {
          type: 'keyword',
          _meta: { description: 'The version of Kibana' },
        },
        memory_js_heap_size_limit: {
          type: 'long',
          _meta: { description: 'The maximum size of the heap', optional: true },
        },
        memory_js_heap_size_total: {
          type: 'long',
          _meta: { description: 'The total size of the heap', optional: true },
        },
        memory_js_heap_size_used: {
          type: 'long',
          _meta: { description: 'The used size of the heap', optional: true },
        },
        load_started: {
          type: 'long',
          _meta: { description: 'When the render template starts loading assets', optional: true },
        },
        bootstrap_started: {
          type: 'long',
          _meta: { description: 'When kbnBootstrap callback is called', optional: true },
        },
        core_created: {
          type: 'long',
          _meta: { description: 'When core system is created', optional: true },
        },
        setup_done: {
          type: 'long',
          _meta: { description: 'When core system setup is complete', optional: true },
        },
        start_done: {
          type: 'long',
          _meta: { description: 'When core system start is complete', optional: true },
        },
        first_app_nav: {
          type: 'long',
          _meta: {
            description: 'When the application emits the first app navigation',
            optional: true,
          },
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
