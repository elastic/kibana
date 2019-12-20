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

export class StateContainersExamplesPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'state-containers-example-browser-history',
      title: 'State containers example - browser history routing',
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./app');
        return renderApp(params, {
          appInstanceId: '1-with-browser-history',
          historyType: History.Browser,
        });
      },
    });
    core.application.register({
      id: 'state-containers-example-hash-history',
      title: 'State containers example - hash history routing',
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./app');
        return renderApp(params, {
          appInstanceId: '2-with-hash-history',
          historyType: History.Hash,
        });
      },
    });
  }

  public start() {}
  public stop() {}
}
