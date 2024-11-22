/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import { mount } from './mount';

export interface ResponseStreamSetupPlugins {
  developerExamples: DeveloperExamplesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResponseStreamStartPlugins {}

export class ResponseStreamPlugin implements Plugin {
  public setup(
    core: CoreSetup<ResponseStreamStartPlugins, void>,
    { developerExamples }: ResponseStreamSetupPlugins
  ) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description:
        'This example demonstrates how to stream chunks of data to the client with just a single request.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/examples/response_stream/README.md',
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
