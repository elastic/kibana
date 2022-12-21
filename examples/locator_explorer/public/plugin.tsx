/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  share: SharePluginSetup;
}

interface StartDeps {
  share: SharePluginStart;
}

export class LocatorExplorerPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples, share }: SetupDeps) {
    core.application.register({
      id: 'locatorExplorer',
      title: 'Locator explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        return renderApp(
          {
            share,
          },
          params
        );
      },
    });

    developerExamples.register({
      title: 'URL locators',
      description: `Locators offer are a backward compatible safe way to persist a URL in a saved object.
       Store the locator ID and params, instead of the href string. When the link is recreated at run time, the service
       will run the state through any necessary migrations. Registrators can change their URL structure
       without breaking these links stored in saved objects.
      `,
      appId: 'locatorExplorer',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/src/plugins/share/common/url_service/locators/README.md',
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
