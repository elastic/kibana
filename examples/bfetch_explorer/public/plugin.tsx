/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
