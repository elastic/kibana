/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type {
  AppDependencies,
  IManagementSectionsPluginsSetup,
  IManagementSectionsPluginsStart,
} from '..';
import { APP } from '..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { renderApp } from './render';
import { SearchSessionsConfigSchema } from '../../../../../config';

export class SearchSessionsMgmtApp {
  constructor(
    private coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
    private setupDeps: IManagementSectionsPluginsSetup,
    private config: SearchSessionsConfigSchema,
    private kibanaVersion: string,
    private params: ManagementAppMountParams
  ) {}

  public async mountManagementSection() {
    const { coreSetup, params, setupDeps } = this;
    const [coreStart, pluginsStart] = await coreSetup.getStartServices();

    const {
      chrome: { docTitle },
      http,
      docLinks,
      i18n,
      notifications,
      uiSettings,
      application,
    } = coreStart;

    const pluginName = APP.getI18nName();
    docTitle.change(pluginName);
    this.params.setBreadcrumbs([{ text: pluginName }]);

    const api = new SearchSessionsMgmtAPI(setupDeps.sessionsClient, this.config, {
      notifications,
      locators: pluginsStart.share.url.locators,
      application,
      usageCollector: setupDeps.searchUsageCollector,
    });

    const documentation = new AsyncSearchIntroDocumentation(docLinks);

    const dependencies: AppDependencies = {
      config: this.config,
      documentation,
      core: coreStart,
      api,
      http,
      i18n,
      uiSettings,
      share: pluginsStart.share,
      kibanaVersion: this.kibanaVersion,
      searchUsageCollector: setupDeps.searchUsageCollector,
    };

    const { element } = params;
    const unmountAppCb = renderApp(element, dependencies);

    return () => {
      docTitle.reset();
      unmountAppCb();
    };
  }
}

export { renderApp };
