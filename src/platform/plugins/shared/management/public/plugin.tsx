/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n as kbnI18n } from '@kbn/i18n';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, catchError, map, merge, of } from 'rxjs';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
  AppUpdater,
  AppDeepLink,
  AppDeepLinkLocations,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, AppStatus } from '@kbn/core/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import type {
  ConfigSchema,
  ManagementSetup,
  ManagementStart,
  NavigationCardsSubject,
  AutoOpsStatusHook,
  AutoOpsStatusResult,
} from './types';

import { MANAGEMENT_APP_ID } from '../common/contants';
import { ManagementAppLocatorDefinition } from '../common/locator';
import {
  ManagementSectionsService,
  getSectionsServiceStartPrivate,
} from './management_sections_service';
import type { ManagementApp, ManagementSection } from './utils';

interface VisibleInUpdate {
  app: ManagementApp;
  visibleIn: AppDeepLinkLocations[] | undefined;
}

const defaultAutoOpsStatusResult: AutoOpsStatusResult = {
  isCloudConnectAutoopsEnabled: false,
  isLoading: true,
};

const defaultAutoOpsStatusHook: AutoOpsStatusHook = () => defaultAutoOpsStatusResult;

interface ManagementSetupDependencies {
  home?: HomePublicPluginSetup;
  share: SharePluginSetup;
  cloud?: { isCloudEnabled: boolean; baseUrl?: string };
}

interface ManagementStartDependencies {
  share: SharePluginStart;
  serverless?: ServerlessPluginStart;
  cloud?: { isCloudEnabled: boolean; baseUrl?: string };
  cps?: CPSPluginStart;
}

export class ManagementPlugin
  implements
    Plugin<
      ManagementSetup,
      ManagementStart,
      ManagementSetupDependencies,
      ManagementStartDependencies
    >
{
  private readonly managementSections = new ManagementSectionsService();

  /** Latest `visibleIn$` emission per app; takes precedence over the registered `visibleIn`. */
  private readonly runtimeVisibleIn = new Map<ManagementApp, AppDeepLinkLocations[]>();

  private readonly createDeepLinksUpdater = (): AppUpdater => () => {
    const deepLinks: AppDeepLink[] = this.managementSections
      .getAllSections()
      .map((section: ManagementSection) => ({
        id: section.id,
        title: section.title,
        deepLinks: section
          .getAppsEnabled()
          .map((mgmtApp) => ({
            mgmtApp,
            visibleIn: this.runtimeVisibleIn.get(mgmtApp) ?? mgmtApp.visibleIn,
          }))
          .filter(({ mgmtApp, visibleIn }) => visibleIn || !mgmtApp.hideFromGlobalSearch)
          .map(({ mgmtApp, visibleIn }) => ({
            id: mgmtApp.id,
            title: mgmtApp.title,
            path: mgmtApp.basePath,
            keywords: mgmtApp.keywords,
            visibleIn: visibleIn ?? ['globalSearch', 'projectSideNav'],
          })),
      }));

    return { deepLinks };
  };

  private readonly appUpdater = new BehaviorSubject<AppUpdater>(this.createDeepLinksUpdater());

  private visibleInSubscription?: Subscription;

  private hasAnyEnabledApps = true;

  private isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
  private cardsNavigationConfig$ = new BehaviorSubject<NavigationCardsSubject>({
    enabled: false,
    hideLinksTo: [],
    extendCardNavDefinitions: {},
  });
  private autoOpsStatusHook?: AutoOpsStatusHook;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  private registerAutoOpsStatusHook = (hook: AutoOpsStatusHook) => {
    this.autoOpsStatusHook = hook;
  };

  private getAutoOpsStatusHook = () => {
    return this.autoOpsStatusHook ?? defaultAutoOpsStatusHook;
  };

  public setup(
    core: CoreSetup<ManagementStartDependencies>,
    { home, share, cloud }: ManagementSetupDependencies
  ) {
    const kibanaVersion = this.initializerContext.env.packageInfo.version;
    const locator = share.url.locators.create(new ManagementAppLocatorDefinition());
    const managementPlugin = this;

    if (home) {
      home.featureCatalogue.register({
        id: 'stack-management',
        title: kbnI18n.translate('management.stackManagement.managementLabel', {
          defaultMessage: 'Stack Management',
        }),
        description: kbnI18n.translate('management.stackManagement.managementDescription', {
          defaultMessage: 'Your center console for managing the Elastic Stack.',
        }),
        icon: 'managementApp',
        path: '/app/management',
        showOnHomePage: false,
        category: 'admin',
        visible: () => this.hasAnyEnabledApps,
      });
    }

    core.application.register({
      id: MANAGEMENT_APP_ID,
      title: kbnI18n.translate('management.stackManagement.title', {
        defaultMessage: 'Stack Management',
      }),
      order: 9040,
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.management,
      updater$: this.appUpdater,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, deps] = await core.getStartServices();
        const chromeStyle$ = coreStart.chrome.getChromeStyle$();

        // Resolve fleet at runtime via `core.plugins.onStart` instead of declaring it
        // as a plugin dependency to avoid massive circular dependency issues in the plugin graph.
        const fleetResult = await coreStart.plugins.onStart<{
          fleet: { config: { isAirGapped?: boolean } };
        }>('fleet');
        const isAirGapped =
          Boolean(fleetResult.fleet.found && fleetResult.fleet.contract.config.isAirGapped) &&
          !Boolean(deps.cloud?.isCloudEnabled);

        return renderApp(params, {
          sections: getSectionsServiceStartPrivate(),
          kibanaVersion,
          coreStart,
          cloud: deps.cloud,
          isAirGapped,
          setBreadcrumbs: (newBreadcrumbs) => {
            if (deps.serverless) {
              // drop the root management breadcrumb in serverless because it comes from the navigation tree
              const [, ...trailingBreadcrumbs] = newBreadcrumbs;
              deps.serverless.setBreadcrumbs(trailingBreadcrumbs);
            } else {
              const chromeStyle = coreStart.chrome.getChromeStyle();
              if (chromeStyle === 'project') {
                // Project chrome (solution spaces): the navigation tree provides "Stack Management > App".
                // Management apps provide breadcrumbs as [Stack Management, App, ...details].
                // We drop the first two and append the rest to the nav tree path.
                const [, , ...trailingBreadcrumbs] = newBreadcrumbs;
                coreStart.chrome.setBreadcrumbs([], {
                  project: { value: trailingBreadcrumbs },
                });
              } else {
                // Classic chrome: use full breadcrumb trail as-is
                coreStart.chrome.setBreadcrumbs(newBreadcrumbs);
              }
            }
          },
          isSidebarEnabled$: managementPlugin.isSidebarEnabled$,
          cardsNavigationConfig$: managementPlugin.cardsNavigationConfig$,
          chromeStyle$,
          getAutoOpsStatusHook: managementPlugin.getAutoOpsStatusHook,
        });
      },
    });

    core.getStartServices().then(([coreStart]) => {
      coreStart.chrome
        .getChromeStyle$()
        .subscribe((style) => this.isSidebarEnabled$.next(style === 'classic'));
    });

    return {
      sections: this.managementSections.setup(),
      locator,
      registerAutoOpsStatusHook: this.registerAutoOpsStatusHook,
    };
  }

  public start(core: CoreStart, plugins: ManagementStartDependencies): ManagementStart {
    this.managementSections.start({ capabilities: core.application.capabilities });
    this.hasAnyEnabledApps = getSectionsServiceStartPrivate()
      .getSectionsEnabled()
      .some((section) => section.getAppsEnabled().length > 0);

    if (!this.hasAnyEnabledApps) {
      this.appUpdater.next(() => {
        return {
          status: AppStatus.inaccessible,
          visibleIn: [],
        };
      });
    } else {
      this.subscribeToVisibleInUpdates();
    }

    plugins.cps?.cpsManager?.registerAppAccess('management', (location: string) =>
      location.includes('management/ml')
        ? ProjectRoutingAccess.READONLY
        : ProjectRoutingAccess.DISABLED
    );

    return {
      setupCardsNavigation: ({ enabled, hideLinksTo, extendCardNavDefinitions }) =>
        this.cardsNavigationConfig$.next({ enabled, hideLinksTo, extendCardNavDefinitions }),
    };
  }

  public stop() {
    this.visibleInSubscription?.unsubscribe();
  }

  private subscribeToVisibleInUpdates() {
    const visibleInUpdates$ = this.managementSections
      .getAllSections()
      .flatMap((section) => section.apps)
      .flatMap((app) => {
        const { visibleIn$ } = app;
        return visibleIn$ ? [{ app, visibleIn$ }] : [];
      })
      .map(({ app, visibleIn$ }) =>
        visibleIn$.pipe(
          map((visibleIn): VisibleInUpdate => ({ app, visibleIn })),
          // A failing source falls back to the registered `visibleIn` without stopping the others.
          catchError(() => of<VisibleInUpdate>({ app, visibleIn: undefined }))
        )
      );

    if (visibleInUpdates$.length === 0) {
      return;
    }

    this.visibleInSubscription = merge(...visibleInUpdates$).subscribe(({ app, visibleIn }) => {
      if (visibleIn !== undefined) {
        this.runtimeVisibleIn.set(app, visibleIn);
      } else {
        this.runtimeVisibleIn.delete(app);
      }
      this.appUpdater.next(this.createDeepLinksUpdater());
    });
  }
}
