/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SharePluginStart } from '../../../src/plugins/share/public';
import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

interface StartDeps {
  share: SharePluginStart;
}

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class AccessLinksExplorerPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'urlGeneratorsExplorer',
      title: 'Access links explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const depsStart = (await core.getStartServices())[1];
        const { renderApp } = await import('./app');
        return renderApp(
          {
            getLinkGenerator: depsStart.share.urlGenerators.getUrlGenerator,
          },
          params
        );
      },
    });

    developerExamples.register({
      title: 'Url generators',
      description: `Url generators offer are a backward compatible safe way to persist a URL in a saved object.
       Store the url generator id and state, instead of the href string. When the link is recreated at run time, the service
       will run the state through any necessary migrations. Registrators can change their URL structure
       without breaking these links stored in saved objects.
      `,
      appId: 'urlGeneratorsExplorer',
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/blob/master/src/plugins/share/public/url_generators/README.md',
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
