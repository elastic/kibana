/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import {
  KibanaOverviewPluginSetup,
  KibanaOverviewPluginStart,
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME, PLUGIN_PATH } from '../common';
import { setServices } from './kibana_services';

export class KibanaOverviewPlugin
  implements
    Plugin<
      KibanaOverviewPluginSetup,
      KibanaOverviewPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { home }: AppPluginSetupDependencies
  ): KibanaOverviewPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'kibanaOverview',
      title: PLUGIN_NAME,
      appRoute: PLUGIN_PATH,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        setServices({
          addBasePath: core.http.basePath.prepend,
          application: coreStart.application,
          banners: coreStart.overlays.banners,
          chrome: coreStart.chrome,
          docLinks: coreStart.docLinks,
          getBasePath: core.http.basePath.get,
          http: coreStart.http,
          indexPatternService: depsStart.data.indexPatterns,
          savedObjectsClient: coreStart.savedObjects.client,
          toastNotifications: core.notifications.toasts,
          uiSettings: core.uiSettings,
        });

        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    if (home) {
      home.featureCatalogue.registerSolution({
        id: 'kibana',
        title: i18n.translate('home.kibana.featureCatalogue.title', {
          defaultMessage: 'Kibana',
        }),
        subtitle: i18n.translate('home.kibana.featureCatalogue.subtitle', {
          defaultMessage: 'Visualize & analyze',
        }),
        descriptions: [
          i18n.translate('home.kibana.featureCatalogueDescription1', {
            defaultMessage: 'Analyze data in dashboards.',
          }),
          i18n.translate('home.kibana.featureCatalogueDescription2', {
            defaultMessage: 'Search and find insights.',
          }),
          i18n.translate('home.kibana.featureCatalogueDescription3', {
            defaultMessage: 'Design pixel-perfect reports.',
          }),
          i18n.translate('home.kibana.featureCatalogueDescription4', {
            defaultMessage: 'Plot geographic data.',
          }),
          i18n.translate('home.kibana.featureCatalogueDescription5', {
            defaultMessage: 'Model, predict, and detect.',
          }),
          i18n.translate('home.kibana.featureCatalogueDescription6', {
            defaultMessage: 'Reveal patterns and relationships.',
          }),
        ],
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
