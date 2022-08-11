/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { distinct, map, switchMap } from 'rxjs/operators';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_APP_CATEGORIES,
  AppStatus,
  AppNavLinkStatus,
} from '@kbn/core/public';
import {
  KibanaOverviewPluginSetup,
  KibanaOverviewPluginStart,
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH, PLUGIN_ICON } from '../common';
import { init as initStatsReporter } from './lib/ui_metric';

export class KibanaOverviewPlugin
  implements
    Plugin<
      KibanaOverviewPluginSetup,
      KibanaOverviewPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { home, usageCollection }: AppPluginSetupDependencies
  ): KibanaOverviewPluginSetup {
    if (usageCollection) {
      initStatsReporter(usageCollection.reportUiCounter);
    }

    const appUpdater$ = from(core.getStartServices()).pipe(
      switchMap(([coreDeps]) => coreDeps.chrome.navLinks.getNavLinks$()),
      map((navLinks) => {
        const hasKibanaApp = Boolean(
          navLinks.find(
            ({ id, category, hidden }) => !hidden && category?.id === 'kibana' && id !== PLUGIN_ID
          )
        );

        return hasKibanaApp;
      }),
      distinct(),
      map((hasKibanaApp) => {
        return () => {
          if (!hasKibanaApp) {
            return { status: AppStatus.inaccessible, navLinkStatus: AppNavLinkStatus.hidden };
          } else {
            return { status: AppStatus.accessible, navLinkStatus: AppNavLinkStatus.default };
          }
        };
      })
    );

    // Register an application into the side navigation menu
    core.application.register({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      euiIconType: PLUGIN_ICON,
      order: 1,
      updater$: appUpdater$,
      appRoute: PLUGIN_PATH,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();

        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    if (home) {
      home.featureCatalogue.registerSolution({
        id: 'kibana',
        title: i18n.translate('kibanaOverview.kibana.solution.title', {
          defaultMessage: 'Analytics',
        }),
        description: i18n.translate('kibanaOverview.kibana.solution.description', {
          defaultMessage:
            'Explore, visualize, and analyze your data using a powerful suite of analytical tools and applications.',
        }),
        icon: 'logoKibana',
        path: PLUGIN_PATH,
        order: 400,
      });
    }

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): KibanaOverviewPluginStart {
    return {};
  }

  public stop() {}
}
