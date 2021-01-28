/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/public';

import { FeatureCatalogueCategory } from '../../home/public';
import { AppSetupUIPluginDependencies } from './types';

export class ConsoleUIPlugin implements Plugin<void, void, AppSetupUIPluginDependencies> {
  public setup(
    { notifications, getStartServices, http }: CoreSetup,
    { devTools, home, usageCollection }: AppSetupUIPluginDependencies
  ) {
    if (home) {
      home.featureCatalogue.register({
        id: 'console',
        title: i18n.translate('console.devToolsTitle', {
          defaultMessage: 'Interact with the Elasticsearch API',
        }),
        description: i18n.translate('console.devToolsDescription', {
          defaultMessage: 'Skip cURL and use a JSON interface to work with your data in Console.',
        }),
        icon: 'consoleApp',
        path: '/app/dev_tools#/console',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    devTools.register({
      id: 'console',
      order: 1,
      title: i18n.translate('console.consoleDisplayName', {
        defaultMessage: 'Console',
      }),
      enableRouting: false,
      mount: async ({ element }) => {
        const [core] = await getStartServices();

        const {
          i18n: { Context: I18nContext },
          docLinks: { DOC_LINK_VERSION },
        } = core;

        const { renderApp } = await import('./application');

        return renderApp({
          http,
          docLinkVersion: DOC_LINK_VERSION,
          I18nContext,
          notifications,
          usageCollection,
          element,
        });
      },
    });
  }

  public start() {}
}
