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

import { AppMountParameters, CoreSetup, Plugin, AppNavLinkStatus } from '../../../src/core/public';
import { AppPluginDependencies } from './with_data_services/types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class StateContainersExamplesPlugin implements Plugin {
  public setup(core: CoreSetup, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'stateContainersExampleBrowserHistory',
      title: 'State containers example - browser history routing',
      navLinkStatus: AppNavLinkStatus.hidden,
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
      navLinkStatus: AppNavLinkStatus.hidden,
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
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./with_data_services/application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginDependencies, params);
      },
    });

    developerExamples.register({
      appId: 'stateContainersExampleBrowserHistory',
      title: 'State containers using browser history',
      description: `An example todo app that uses browser history and state container utilities like createStateContainerReactHelpers,
       createStateContainer, createKbnUrlStateStorage, createSessionStorageStateStorage,
       syncStates and getStateFromKbnUrl to keep state in sync with the URL. Change some parameters, navigate away and then back, and the
       state should be preserved.`,
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/tree/master/src/plugins/kibana_utils/docs/state_containers/README.md',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    developerExamples.register({
      appId: 'stateContainersExampleHashHistory',
      title: 'State containers using hash history',
      description: `An example todo app that uses hash history and state container utilities like createStateContainerReactHelpers,
       createStateContainer, createKbnUrlStateStorage, createSessionStorageStateStorage,
       syncStates and getStateFromKbnUrl to keep state in sync with the URL. Change some parameters, navigate away and then back, and the
       state should be preserved.`,
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/tree/master/src/plugins/kibana_utils/docs/state_containers/README.md',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: 'Sync state from a query bar with the url',
      description: `Shows how to use data.syncQueryStateWitUrl in combination  with state container utilities from kibana_utils to
      show a query bar that stores state in the url and is kept in  sync. 
      `,
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/blob/master/src/plugins/data/public/query/state_sync/README.md',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}
  public stop() {}
}
