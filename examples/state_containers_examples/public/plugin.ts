/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
