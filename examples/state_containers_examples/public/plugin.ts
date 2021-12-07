/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, Plugin, AppNavLinkStatus } from '../../../src/core/public';
import { AppPluginDependencies } from './with_data_services/types';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import image from './state_sync.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class StateContainersExamplesPlugin implements Plugin {
  public setup(core: CoreSetup, { developerExamples }: SetupDeps) {
    const examples = {
      stateContainersExampleBrowserHistory: {
        title: 'Todo App (browser history)',
      },
      stateContainersExampleHashHistory: {
        title: 'Todo App (hash history)',
      },
      stateContainersExampleWithDataServices: {
        title: 'Search bar integration',
      },
    };

    const exampleLinks = Object.keys(examples).map((id: string) => ({
      appId: id,
      title: examples[id as keyof typeof examples].title,
    }));

    core.application.register({
      id: 'stateContainersExampleBrowserHistory',
      title: examples.stateContainersExampleBrowserHistory.title,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./todo/app');
        const [coreStart] = await core.getStartServices();
        return renderApp(
          params,
          {
            appTitle: examples.stateContainersExampleBrowserHistory.title,
            historyType: History.Browser,
          },
          { navigateToApp: coreStart.application.navigateToApp, exampleLinks }
        );
      },
    });
    core.application.register({
      id: 'stateContainersExampleHashHistory',
      title: examples.stateContainersExampleHashHistory.title,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const { renderApp, History } = await import('./todo/app');
        const [coreStart] = await core.getStartServices();
        return renderApp(
          params,
          {
            appTitle: examples.stateContainersExampleHashHistory.title,
            historyType: History.Hash,
          },
          { navigateToApp: coreStart.application.navigateToApp, exampleLinks }
        );
      },
    });

    core.application.register({
      id: 'stateContainersExampleWithDataServices',
      title: examples.stateContainersExampleWithDataServices.title,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./with_data_services/application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart as AppPluginDependencies, params, { exampleLinks });
      },
    });

    developerExamples.register({
      appId: exampleLinks[0].appId,
      title: 'State Management',
      description: 'Examples of using state containers and state syncing utils.',
      image,
      links: [
        {
          label: 'State containers README',
          href: 'https://github.com/elastic/kibana/tree/main/src/plugins/kibana_utils/docs/state_containers',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
        {
          label: 'State sync utils README',
          href: 'https://github.com/elastic/kibana/tree/main/src/plugins/kibana_utils/docs/state_sync',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
        {
          label: 'Kibana navigation best practices',
          href: 'https://www.elastic.co/guide/en/kibana/master/kibana-navigation.html',
          iconType: 'logoKibana',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}
  public stop() {}
}
