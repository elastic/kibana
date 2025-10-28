/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { Client, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type api from '@elastic/elasticsearch/lib/api/types';
import type {
  IDataStreamClient,
  BaseSearchRuntimeMappings,
  DataStreamDefinition,
  IDataStreamClientIndexRequest,
  SearchRequestImproved,
  ClientHelpers,
} from './types';
import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';

type AnyDataStream = DataStreamDefinition<any>;

type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

export interface DataStreamClientArgs<
  S extends object,
  SRM extends BaseSearchRuntimeMappings = {}
> {
  /**
   * @remark For now just one
   */
  dataStreams: DataStreamDefinition<S, SRM>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;

  // TODO: support serialize/deserialize opts so that we can map from S => Deserialized values
  //       For example: read a doc { date: '2023-10-01T00:00:00Z' } and deserialize it to { date: moment.Moment }
  //                    write a doc { date: moment.Moment } and serialize it to { date: '2023-10-01T00:00:00Z' }
}

export class DataStreamClient<S extends object, SRM extends BaseSearchRuntimeMappings>
  implements IDataStreamClient<S, SRM>
{
  public helpers: ClientHelpers<SRM> = {
    getFieldsFromHit: (hit) => {
      const fields = (hit.fields ?? {}) as Record<keyof SRM, unknown[]>;
      return fields;
    },
  };
  private readonly runtimeFields: string[];
  private constructor(
    private readonly client: ElasticsearchClient,
    private readonly dataStreams: AnyDataStream
  ) {
    this.runtimeFields = Object.keys(dataStreams.searchRuntimeMappings ?? {});
  }

  public async index(args: IDataStreamClientIndexRequest<S>) {
    return this.client.index({
      index: this.dataStreams.name,
      ...args,
    });
  }

  public async search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: SearchRequestImproved<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) {
    return this.client.search<S, Agg>(
      {
        index: this.dataStreams.name,
        runtime_mappings: this.dataStreams.searchRuntimeMappings,
        fields: this.runtimeFields,
        ...args,
      },
      transportOpts
    );
  }

  /**
   * This function ensures setup has been run before returning an instance of the client.
   *
   * @remark This function should execute early in the application lifecycle and preferably once per
   *         data stream. However, it should be idempotent.
   */
  public static async initialize<S extends object, SRM extends BaseSearchRuntimeMappings>(
    args: DataStreamClientArgs<S, SRM>
  ): Promise<DataStreamClient<S, SRM>> {
    validateClientArgs(args);
    await initialize(args);
    return new DataStreamClient<S, SRM>(args.elasticsearchClient, args.dataStreams);
  }

  // TODO: expose a create function that skips initialization
}
