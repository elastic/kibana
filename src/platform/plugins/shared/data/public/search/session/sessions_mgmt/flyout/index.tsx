/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { SearchSessionsMgmtFlyout } from '../components/main';
import {
  AppDependencies,
  type IManagementSectionsPluginsSetup,
  type IManagementSectionsPluginsStart,
} from '..';

export class SearchSessionsMgmtAppFlyout {
  constructor(
    private coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
    private setupDeps: IManagementSectionsPluginsSetup,
    private config: SearchSessionsConfigSchema,
    private kibanaVersion: string
  ) {}

  public async getFlyout() {
    const { coreSetup, setupDeps } = this;
    const [coreStart, pluginsStart] = await coreSetup.getStartServices();

    const { http, docLinks, i18n, notifications, uiSettings, application } = coreStart;

    const api = new SearchSessionsMgmtAPI(setupDeps.sessionsClient, this.config, {
      notifications,
      locators: pluginsStart.share.url.locators,
      application,
      usageCollector: setupDeps.searchUsageCollector,
    });

    const documentation = new AsyncSearchIntroDocumentation(docLinks);
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings,
    });

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

    return (
      <KibanaRenderContextProvider {...dependencies.core}>
        <KibanaReactContextProvider>
          <SearchSessionsMgmtFlyout {...dependencies} timezone={uiSettings.get('dateFormat:tz')} />
        </KibanaReactContextProvider>
      </KibanaRenderContextProvider>
    );
  }
}
