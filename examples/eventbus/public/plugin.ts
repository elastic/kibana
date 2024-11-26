/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { EventBusPluginStart } from '@kbn/event-bus-plugin/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';

import { mount } from './mount';

export interface EventBusExampleSetupPlugins {
  developerExamples: DeveloperExamplesSetup;
}

export interface EventBusExampleStartPlugins {
  data: DataPublicPluginStart;
  eventBus: EventBusPluginStart;
}

export class EventBusExamplePlugin implements Plugin {
  public setup(
    core: CoreSetup<EventBusExampleStartPlugins, void>,
    { developerExamples }: EventBusExampleSetupPlugins
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
        'This example demonstrates how to use the event bus plugin to manage framework agnostic state.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/examples/eventbus/README.md',
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
