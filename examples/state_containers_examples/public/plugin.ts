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

import { AppMountParameters, CoreSetup, Plugin } from 'kibana/public';
import { AppPluginDependencies } from './with_data_services/types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class StateContainersExamplesPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'stateContainersExampleBrowserHistory',
      title: 'State containers example - browser history routing',
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./todo/app');
        return renderApp(params, {
          appInstanceId: '1',
          appTitle: 'Routing with browser history',
          historyType: History.Browser,
        });
      },
    });
    core.application.register({
      id: 'stateContainersExampleHashHistory',
      title: 'State containers example - hash history routing',
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./todo/app');
        return renderApp(params, {
          appInstanceId: '2',
          appTitle: 'Routing with hash history',
          historyType: History.Hash,
        });
      },
    });

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./with_data_services/application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginDependencies, params);
      },
    });
  }

  public start() {}
  public stop() {}
}
