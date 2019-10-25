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

import { sortBy } from 'lodash';
import { App, CoreSetup, Plugin } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import { LocalApplicationService } from '../local_application_service';

export interface DevToolsPluginSetupDependencies {
  __LEGACY: {
    localApplicationService: LocalApplicationService;
    FeatureCatalogueRegistryProvider: any;
  };
}

export interface DevToolsSetup {
  register: (devTool: DevTool) => void;
}

export interface DevTool {
  id: string;
  title: string;
  mount: App['mount'];
  disabled?: boolean;
  tooltipContent?: string;
  enableRouting: boolean;
  order: number;
}

export class DevToolsPlugin implements Plugin<DevToolsSetup> {
  private devTools: DevTool[] = [];

  private getSortedDevTools() {
    // TODO make sure this works
    return sortBy(this.devTools, 'order');
  }

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { localApplicationService, FeatureCatalogueRegistryProvider },
    }: DevToolsPluginSetupDependencies
  ) {
    FeatureCatalogueRegistryProvider.register(() => {
      return {
        id: 'console',
        title: i18n.translate('kbn.devTools.consoleTitle', {
          defaultMessage: 'Console',
        }),
        description: i18n.translate('kbn.devTools.consoleDescription', {
          defaultMessage: 'Skip cURL and use this JSON interface to work with your data directly.',
        }),
        icon: 'consoleApp',
        path: '/app/kibana#/dev_tools/console',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      };
    });
    localApplicationService.register({
      id: 'dev_tools',
      title: 'Dev Tools',
      mount: async (appMountContext, params) => {
        // TODO check capabilities whether this page is allowed to be rendered
        // TODO badge and breadcrumb handling
        const { renderApp } = await import('./render_app');
        return renderApp(
          params.element,
          appMountContext,
          params.appBasePath,
          this.getSortedDevTools()
        );
      },
    });

    return {
      register: (devTool: DevTool) => {
        this.devTools.push(devTool);
      },
    };
  }

  start() {}
}
