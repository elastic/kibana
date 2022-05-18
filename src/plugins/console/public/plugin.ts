/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/public';

import {
  AppSetupUIPluginDependencies,
  ClientConfigType,
  ConsolePluginSetup,
  ConsoleUILocatorParams,
} from './types';

export class ConsoleUIPlugin implements Plugin<void, void, AppSetupUIPluginDependencies> {
  constructor(private ctx: PluginInitializerContext) {}

  public setup(
    { notifications, getStartServices, http }: CoreSetup,
    { devTools, home, share, usageCollection }: AppSetupUIPluginDependencies
  ): ConsolePluginSetup {
    const {
      ui: { enabled: isConsoleUiEnabled },
    } = this.ctx.config.get<ClientConfigType>();

    if (isConsoleUiEnabled) {
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
          category: 'admin',
        });
      }

      devTools.register({
        id: 'console',
        order: 1,
        title: i18n.translate('console.consoleDisplayName', {
          defaultMessage: 'Console',
        }),
        enableRouting: false,
        mount: async ({ element, theme$ }) => {
          const [core] = await getStartServices();

          const {
            i18n: { Context: I18nContext },
            docLinks: { DOC_LINK_VERSION, links },
          } = core;

          const { renderApp } = await import('./application');

          return renderApp({
            http,
            docLinkVersion: DOC_LINK_VERSION,
            docLinks: links,
            I18nContext,
            notifications,
            usageCollection,
            element,
            theme$,
          });
        },
      });

      const locator = share.url.locators.create<ConsoleUILocatorParams>({
        id: 'CONSOLE_APP_LOCATOR',
        getLocation: async ({ loadFrom }) => {
          return {
            app: 'dev_tools',
            path: `#/console${loadFrom ? `?load_from=${loadFrom}` : ''}`,
            state: { loadFrom },
          };
        },
      });

      return { locator };
    }

    return {};
  }

  public start() {}
}
