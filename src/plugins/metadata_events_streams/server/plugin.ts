/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type { MetadataEventsStreamsPluginSetup, MetadataEventsStreamsPluginStart } from './types';
import { MetadataEventsStreams, MetadataEventsStreamsIndex } from './services';

export class MetadataEventsStreamsPlugin
  implements Plugin<MetadataEventsStreamsPluginSetup, MetadataEventsStreamsPluginStart, {}, {}>
{
  private readonly logger: Logger;
  private metadataEventsStreamsIndex: MetadataEventsStreamsIndex;
  private metadataEventsStreams: MetadataEventsStreams;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.metadataEventsStreams = new MetadataEventsStreams();
    this.metadataEventsStreamsIndex = new MetadataEventsStreamsIndex({
      logger: this.logger,
    });
  }

  public setup({ http }: CoreSetup) {
    this.logger.debug('Setting up MetadataEventsStream plugin');

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up MetadataEventsStream plugin');

    const esClient = core.elasticsearch.client.asInternalUser;

    /** Create the .kibana-events-streams index */
    this.metadataEventsStreamsIndex.init({ esClient });

    this.metadataEventsStreams.init({
      metadataEventsStreamsIndex: this.metadataEventsStreamsIndex,
    });

    return {
      registerEventStream: this.metadataEventsStreams.registerEventStream.bind(
        this.metadataEventsStreams
      ),
    };
  }
}
