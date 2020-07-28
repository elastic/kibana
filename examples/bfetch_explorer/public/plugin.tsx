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

import { Plugin, CoreSetup, AppNavLinkStatus } from '../../../src/core/public';
import { BfetchPublicSetup, BfetchPublicStart } from '../../../src/plugins/bfetch/public';
import { mount } from './mount';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

export interface ExplorerService {
  double: (number: { num: number }) => Promise<{ num: number }>;
}

export interface BfetchExplorerSetupPlugins {
  bfetch: BfetchPublicSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface BfetchExplorerStartPlugins {
  bfetch: BfetchPublicStart;
}

export class BfetchExplorerPlugin implements Plugin {
  public setup(
    core: CoreSetup<BfetchExplorerStartPlugins, void>,
    { bfetch, developerExamples }: BfetchExplorerSetupPlugins
  ) {
    const double = bfetch.batchedFunction<{ num: number }, { num: number }>({
      url: '/bfetch_explorer/double',
    });

    const explorer: ExplorerService = {
      double,
    };

    core.application.register({
      id: 'bfetch-explorer',
      title: 'bfetch explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: mount(core, explorer),
    });

    developerExamples.register({
      appId: 'bfetch-explorer',
      title: 'bfetch',
      description:
        'bfetch is a service that allows to batch HTTP requests and streams responses back.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/master/src/plugins/bfetch/README.md',
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
