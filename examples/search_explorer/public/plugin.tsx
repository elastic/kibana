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

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class SearchExplorerPlugin implements Plugin {
  public setup(
    core: CoreSetup<AppPluginStartDependencies, void>,
    { developerExamples }: SetupDeps
  ) {
    core.application.register({
      id: 'searchExplorer',
      title: 'Search Explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'searchExplorer',
      title: 'Data search strategy services',
      description: `Data search services can be used to query Elasticsearch in away that supports background search
        and partial results, when available. It also automatically incorporates settings such as requestTimeout and includeFrozen.
        Use the provided ES search strategy, or register your own.
      `,
      links: [
        {
          label: 'README',
          href:
            'https://github.com/elastic/kibana/blob/master/src/plugins/data/public/search/README.md',
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
