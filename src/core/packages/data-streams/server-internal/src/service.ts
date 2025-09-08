/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pLimit from 'p-limit';
import {
  type DataStreamDefinition,
  type IDataStreamClient,
  DataStreamClient,
} from '@kbn/data-streams';
import type { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';

interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
}

/** @internal */
export class DataStreamsService implements CoreService<DataStreamsSetup, DataStreamsStart> {
  private readonly logger: Logger;
  private readonly dataStreams: Map<
    DataStreamDefinition<any, any>,
    undefined | IDataStreamClient<any, any>
  > = new Map();

  constructor(private readonly coreContext: CoreContext) {
    this.logger = this.coreContext.logger.get('data-streams');
  }

  setup() {
    return {
      registerDataStream: (dataStreamDefinition: DataStreamDefinition) => {
        this.dataStreams.set(dataStreamDefinition, undefined);
      },
    };
  }

  async start({ elasticsearch }: StartDeps) {
    const limit = pLimit(5);
    const setupPromises: Promise<void>[] = [];

    for (const dataStreamDefinition of this.dataStreams.keys()) {
      setupPromises.push(
        limit(async () => {
          this.dataStreams.set(
            dataStreamDefinition,
            await DataStreamClient.initialize({
              dataStreams: dataStreamDefinition,
              elasticsearchClient: elasticsearch.client.asInternalUser,
              logger: this.logger,
            })
          );
        })
      );
    }

    await Promise.all(setupPromises);

    return {
      getClient: <S extends {}, SRM extends {}>(
        dataStreamDefinition: DataStreamDefinition<S, SRM>
      ): IDataStreamClient<S, SRM> => {
        if (!this.dataStreams.has(dataStreamDefinition)) {
          throw new Error(`Data stream ${dataStreamDefinition.name} is not registered.`);
        }
        const client = this.dataStreams.get(dataStreamDefinition);
        if (!client) {
          throw new Error(
            `Data stream client for ${dataStreamDefinition.name} is not initialized. Are you sure you are providing the same definition as in setup?`
          );
        }
        return client;
      },
    };
  }

  stop() {}
}
