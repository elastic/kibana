/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  MetadataEventsStreamsPluginSetup,
  MetadataEventsStreamsPluginStart,
  StreamName,
  MetadataEvent,
  UserContentMetadataEvent,
} from './types';
// import { SavedObjectsManagement } from './services';
// import { registerRoutes } from './routes';
// import { capabilitiesProvider } from './capabilities_provider';
import {
  MetadataEventsStream,
  MetadataEventsStreams,
  MetadataEventsStreamsIndex,
} from './services';

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
    this.logger.debug('Setting up UserContent plugin');

    // registerRoutes({
    //   http,
    //   managementServicePromise: firstValueFrom(this.managementService$),
    // });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up UserContent plugin');

    const esClient = core.elasticsearch.client.asInternalUser;
    this.metadataEventsStreamsIndex.init({ esClient });

    const userContentMetadataEventsStream =
      this.registerEventStream<UserContentMetadataEvent>('userContent');

    // const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    // this.managementService$.next(managementService);

    return {
      userContentMetadataEventsStream,
    };
  }

  private registerEventStream<T extends MetadataEvent>(
    streamName: StreamName
  ): MetadataEventsStream<T> {
    const stream = new MetadataEventsStream<T>(streamName, {
      metadataEventsStreamsIndex: this.metadataEventsStreamsIndex,
    });

    this.metadataEventsStreams.register(streamName, stream);

    return stream;
  }
}
