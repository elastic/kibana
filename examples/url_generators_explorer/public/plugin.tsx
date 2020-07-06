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
