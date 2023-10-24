/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as kbnI18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  AppMountParameters,
  AppUpdater,
  AppStatus,
  AppNavLinkStatus,
  AppDeepLink,
} from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ConfigSchema, ManagementSetup, ManagementStart, NavigationCardsSubject } from './types';

import { MANAGEMENT_APP_ID } from '../common/contants';
import { ManagementAppLocatorDefinition } from '../common/locator';
import {
  ManagementSectionsService,
  getSectionsServiceStartPrivate,
} from './management_sections_service';
import { ManagementSection } from './utils';

interface ManagementSetupDependencies {
  home?: HomePublicPluginSetup;
  share: SharePluginSetup;
}

interface ManagementStartDependencies {
  share: SharePluginStart;
  serverless?: ServerlessPluginStart;
}

const LazyKibanaSettingsApplication = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-application')).KibanaSettingsApplication,
}));

const KibanaSettingsApplication = withSuspense(LazyKibanaSettingsApplication);

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

  private readonly appUpdater = new BehaviorSubject<AppUpdater>(() => {
    const config = this.initializerContext.config.get();
    const navLinkStatus =
      AppNavLinkStatus[config.deeplinks.navLinkStatus as keyof typeof AppNavLinkStatus];

    const deepLinks: AppDeepLink[] = Object.values(this.managementSections.definedSections).map(
      (section: ManagementSection) => ({
        id: section.id,
        title: section.title,
        navLinkStatus,
        deepLinks: section.getAppsEnabled().map((mgmtApp) => ({
          id: mgmtApp.id,
          title: mgmtApp.title,
          path: mgmtApp.basePath,
          keywords: mgmtApp.keywords,
          navLinkStatus,
        })),
      })
    );

    return { deepLinks };
  });

  private hasAnyEnabledApps = true;

  private isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
  private cardsNavigationConfig$ = new BehaviorSubject<NavigationCardsSubject>({
    enabled: false,
    hideLinksTo: [],
    extendCardNavDefinitions: {},
  });

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup<ManagementStartDependencies>,
    { home, share }: ManagementSetupDependencies
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

        return renderApp(params, {
          sections: getSectionsServiceStartPrivate(),
          kibanaVersion,
          coreStart,
          setBreadcrumbs: (newBreadcrumbs) => {
            if (deps.serverless) {
              // drop the root management breadcrumb in serverless because it comes from the navigation tree
              const [, ...trailingBreadcrumbs] = newBreadcrumbs;
              deps.serverless.setBreadcrumbs(trailingBreadcrumbs);
            } else {
              coreStart.chrome.setBreadcrumbs(newBreadcrumbs);
            }
          },
          isSidebarEnabled$: managementPlugin.isSidebarEnabled$,
          cardsNavigationConfig$: managementPlugin.cardsNavigationConfig$,
        });
      },
    });

    return {
      sections: this.managementSections.setup(),
      locator,
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
          navLinkStatus: AppNavLinkStatus.hidden,
        };
      });
    }

    // Register the Settings app only if in serverless, until we integrate the SettingsApplication into the Advanced settings plugin
    // Otherwise, it will be double registered from the Advanced settings plugin
    if (plugins.serverless) {
      const title = kbnI18n.translate('management.settings.settingsLabel', {
        defaultMessage: 'Advanced Settings',
      });

      this.managementSections.definedSections.kibana.registerApp({
        id: 'settings',
        title,
        order: 3,
        async mount({ element, setBreadcrumbs, history }) {
          setBreadcrumbs([{ text: title }]);

          ReactDOM.render(
            <KibanaRenderContextProvider {...core}>
              <KibanaSettingsApplication {...{ ...core, history }} />
            </KibanaRenderContextProvider>,
            element
          );
          return () => {
            ReactDOM.unmountComponentAtNode(element);
          };
        },
      });
    }

    return {
      setIsSidebarEnabled: (isSidebarEnabled: boolean) =>
        this.isSidebarEnabled$.next(isSidebarEnabled),
      setupCardsNavigation: ({ enabled, hideLinksTo, extendCardNavDefinitions }) =>
        this.cardsNavigationConfig$.next({ enabled, hideLinksTo, extendCardNavDefinitions }),
    };
  }
}
