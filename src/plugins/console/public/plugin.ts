/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID } from '@kbn/dev-tools-plugin/public';

import { EmbeddableConsole } from './application/containers/embeddable';
import {
  AppSetupUIPluginDependencies,
  AppStartUIPluginDependencies,
  ClientConfigType,
  ConsolePluginSetup,
  ConsolePluginStart,
  ConsoleUILocatorParams,
  EmbeddedConsoleView,
} from './types';
import {
  AutocompleteInfo,
  setAutocompleteInfo,
  EmbeddableConsoleInfo,
  createStorage,
  setStorage,
  httpService,
} from './services';

export class ConsoleUIPlugin
  implements Plugin<ConsolePluginSetup, ConsolePluginStart, AppSetupUIPluginDependencies>
{
  private readonly autocompleteInfo = new AutocompleteInfo();
  private _embeddableConsole: EmbeddableConsoleInfo;

  constructor(private ctx: PluginInitializerContext) {
    const storage = createStorage({
      engine: window.localStorage,
      prefix: 'sense:',
    });
    setStorage(storage);
    this._embeddableConsole = new EmbeddableConsoleInfo(storage);
  }

  public setup(
    { notifications, getStartServices, http }: CoreSetup,
    { devTools, home, share, usageCollection }: AppSetupUIPluginDependencies
  ): ConsolePluginSetup {
    const {
      ui: { enabled: isConsoleUiEnabled },
    } = this.ctx.config.get<ClientConfigType>();

    httpService.setup(http);
    this.autocompleteInfo.setup(http);
    setAutocompleteInfo(this.autocompleteInfo);

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
        mount: async ({ element }) => {
          const [core] = await getStartServices();

          const {
            docLinks: { DOC_LINK_VERSION, links },
            ...startServices
          } = core;

          const { renderApp } = await import('./application');

          return renderApp({
            ...startServices,
            http,
            docLinkVersion: DOC_LINK_VERSION,
            docLinks: links,
            notifications,
            usageCollection,
            element,
            autocompleteInfo: this.autocompleteInfo,
            isDevMode: this.ctx.env.mode.dev,
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

  public start(core: CoreStart, deps: AppStartUIPluginDependencies): ConsolePluginStart {
    const {
      ui: { enabled: isConsoleUiEnabled, embeddedEnabled: isEmbeddedConsoleEnabled },
    } = this.ctx.config.get<ClientConfigType>();
    const isDevMode = this.ctx.env.mode.dev;

    const consoleStart: ConsolePluginStart = {};
    const embeddedConsoleUiSetting = core.uiSettings.get<boolean>(
      ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID
    );
    const embeddedConsoleAvailable =
      isConsoleUiEnabled &&
      isEmbeddedConsoleEnabled &&
      core.application.capabilities?.dev_tools?.show === true &&
      embeddedConsoleUiSetting;

    if (embeddedConsoleAvailable) {
      consoleStart.EmbeddableConsole = (_props: {}) => {
        return EmbeddableConsole({
          core,
          usageCollection: deps.usageCollection,
          setDispatch: (d) => {
            this._embeddableConsole.setDispatch(d);
          },
          alternateView: this._embeddableConsole.alternateView,
          isDevMode,
          getConsoleHeight: this._embeddableConsole.getConsoleHeight.bind(this._embeddableConsole),
          setConsoleHeight: this._embeddableConsole.setConsoleHeight.bind(this._embeddableConsole),
        });
      };
      consoleStart.isEmbeddedConsoleAvailable = () =>
        this._embeddableConsole.isEmbeddedConsoleAvailable();
      consoleStart.openEmbeddedConsole = (content?: string) =>
        this._embeddableConsole.openEmbeddedConsole(content);
      consoleStart.openEmbeddedConsoleAlternateView = () =>
        this._embeddableConsole.openEmbeddedConsoleAlternateView();
      consoleStart.registerEmbeddedConsoleAlternateView = (view: EmbeddedConsoleView | null) => {
        this._embeddableConsole.registerAlternateView(view);
      };
    }

    return consoleStart;
  }
}
