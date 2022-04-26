/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { MetadataEventsStreamsPluginSetup, MetadataEventsStreamsPluginStart } from './types';
import { MetadataEventsStreamsService } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export class MetadataEventsStreamsPlugin
  implements Plugin<MetadataEventsStreamsPluginSetup, MetadataEventsStreamsPluginStart>
{
  private metadataEventsStreamsService: MetadataEventsStreamsService =
    new MetadataEventsStreamsService();

  constructor() {
    this.metadataEventsStreamsService.init();
  }

  public setup(
    core: CoreSetup<StartDependencies, MetadataEventsStreamsPluginStart>,
    deps: SetupDependencies
  ): MetadataEventsStreamsPluginSetup {
    return {};
  }

  public start(core: CoreStart, deps: StartDependencies) {
    return {
      metadataEventsStreamsService: this.metadataEventsStreamsService,
    };
  }
}
