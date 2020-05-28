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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';

import { FeatureCatalogueCategory } from '../../home/public';

import { AppSetupUIPluginDependencies } from './types';

export class ConsoleUIPlugin implements Plugin<void, void, AppSetupUIPluginDependencies> {
  constructor() {}

  async setup(
    { notifications, getStartServices }: CoreSetup,
    { devTools, home, usageCollection }: AppSetupUIPluginDependencies
  ) {
    home.featureCatalogue.register({
      id: 'console',
      title: i18n.translate('console.devToolsTitle', {
        defaultMessage: 'Console',
      }),
      description: i18n.translate('console.devToolsDescription', {
        defaultMessage: 'Skip cURL and use this JSON interface to work with your data directly.',
      }),
      icon: 'consoleApp',
      path: '/app/dev_tools#/console',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN,
    });

    devTools.register({
      id: 'console',
      order: 1,
      title: i18n.translate('console.consoleDisplayName', {
        defaultMessage: 'Console',
      }),
      enableRouting: false,
      mount: async ({ core: { docLinks, i18n: i18nDep } }, { element }) => {
        const { renderApp } = await import('./application');
        const [{ injectedMetadata }] = await getStartServices();
        const elasticsearchUrl = injectedMetadata.getInjectedVar(
          'elasticsearchUrl',
          'http://localhost:9200'
        ) as string;
        return renderApp({
          docLinkVersion: docLinks.DOC_LINK_VERSION,
          I18nContext: i18nDep.Context,
          notifications,
          elasticsearchUrl,
          usageCollection,
          element,
        });
      },
    });
  }

  async start(core: CoreStart) {}
}
