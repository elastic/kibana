/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type {
  ESDocumentWithOperation,
  Fields,
  SynthtraceESAction,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import { castArray } from 'lodash';
import type { Transform } from 'stream';
import { Readable } from 'stream';
import { isGeneratorObject } from 'util/types';
import type { Logger } from '../utils/create_logger';
import { sequential } from '../utils/stream_utils';
import { KibanaClient } from './base_kibana_client';
import { getKibanaClient } from '../../cli/utils/get_kibana_client';
import { FleetClient } from './fleet_client';

export interface SynthtraceEsClientOptions {
  client: Client;
  kibana?:
    | {
        target: string;
        username?: string;
        password?: string;
        apiKey?: string;
        logger?: Logger;
      }
    | KibanaClient;
  fleetClient?: FleetClient;
  logger: Logger;
  concurrency?: number;
  refreshAfterIndex?: boolean;
  pipeline: (base: Readable) => NodeJS.WritableStream;
}

type MaybeArray<T> = T | T[];

export interface SynthtraceEsClient<TFields extends Fields = {}> {
  index(
    streamOrGenerator: MaybeArray<Readable | SynthtraceGenerator<TFields>>,
    pipelineCallback?: (base: Readable) => NodeJS.WritableStream
  ): Promise<void>;
  clean(): Promise<void>;
  refresh(): ReturnType<Client['indices']['refresh']>;

  setEsClient(client: Client): void;
  setPipeline(cb: (base: Readable) => NodeJS.WritableStream): void;
  getAllIndices(): string[];
}

export class SynthtraceEsClientBase<TFields extends Fields> implements SynthtraceEsClient<TFields> {
  protected client: Client;
  protected readonly kibanaClient?: KibanaClient;
  protected readonly fleetClient?: FleetClient;
  protected readonly logger: Logger;
  private readonly concurrency: number;
  private readonly refreshAfterIndex: boolean;
  private pipelineCallback: (base: Readable) => NodeJS.WritableStream;
  protected dataStreams: string[] = [];
  protected indices: string[] = [];

  constructor(options: SynthtraceEsClientOptions) {
    this.client = options.client;
    this.logger = options.logger;
    this.concurrency = options.concurrency ?? 1;
    this.refreshAfterIndex = options.refreshAfterIndex ?? false;
    this.pipelineCallback = options.pipeline;

    this.kibanaClient = this.initKibanaClient(options.kibana);
    if (this.kibanaClient) {
      this.fleetClient = new FleetClient(this.kibanaClient, this.logger);
    }
  }

  private initKibanaClient(
    input?:
      | KibanaClient
      | {
          target: string;
          username?: string;
          password?: string;
          apiKey?: string;
        }
  ): KibanaClient | undefined {
    if (!input) {
      return undefined;
    }

    if (isKibanaClientConfig(input)) {
      return getKibanaClient({
        target: input.target,
        logger: this.logger,
        username: input.username,
        password: input.password,
        apiKey: input.apiKey,
      });
    }

    return input;
  }

  protected get kibana(): KibanaClient {
    if (!this.kibanaClient) {
      throw new Error('Kibana client is not initialized');
    }
    return this.kibanaClient;
  }

  async clean() {
    this.logger.info(`Cleaning data streams: "${this.dataStreams.join(',')}"`);

    const resolvedIndices = this.indices.length
      ? (
          await this.client.indices.resolveIndex({
            name: this.indices.join(','),
            expand_wildcards: ['open', 'hidden'],
            ignore_unavailable: true,
          })
        ).indices.map((index: { name: string }) => index.name)
      : [];

    if (resolvedIndices.length) {
      this.logger.info(`Cleaning indices: "${resolvedIndices.join(',')}"`);
    }

    await Promise.all([
      ...(this.dataStreams.length
        ? [
            this.client.indices
              .deleteDataStream({
                name: this.dataStreams.join(','),
                expand_wildcards: ['open', 'hidden'],
              })
              .catch((error) => {
                if (error instanceof errors.ResponseError && error.statusCode === 404) {
                  return;
                }
                throw error;
              }),
          ]
        : []),
      ...(resolvedIndices.length
        ? [
            this.client.indices.delete({
              index: resolvedIndices.join(','),
              expand_wildcards: ['open', 'hidden'],
              ignore_unavailable: true,
              allow_no_indices: true,
            }),
          ]
        : []),
    ]);
  }

  async refresh() {
    const allIndices = this.getAllIndices();
    this.logger.info(`Refreshing "${allIndices.join(',')}"`);

    return this.client.indices.refresh({
      index: allIndices,
      allow_no_indices: true,
      ignore_unavailable: true,
      expand_wildcards: ['open', 'hidden'],
    });
  }

  setEsClient(client: Client) {
    this.client = client;
  }
  setPipeline(cb: (base: Readable) => NodeJS.WritableStream) {
    this.pipelineCallback = cb;
  }

  async index(
    streamOrGenerator: MaybeArray<Readable | SynthtraceGenerator<TFields>>,
    pipelineCallback?: (base: Readable) => NodeJS.WritableStream
  ): Promise<void> {
    this.logger.debug(`Bulk indexing ${castArray(streamOrGenerator).length} stream(s)`);

    const pipelineFn = pipelineCallback ?? this.pipelineCallback;

    const allStreams = castArray(streamOrGenerator).map((obj) => {
      const base = isGeneratorObject(obj) ? Readable.from(obj) : obj;

      return pipelineFn(base);
    }) as Transform[];

    let count: number = 0;

    const stream = sequential(...allStreams);

    await this.client.helpers.bulk(
      {
        concurrency: this.concurrency,
        refresh: false,
        refreshOnCompletion: false,
        flushBytes: 250000,
        datasource: stream,
        filter_path: 'errors,items.*.error,items.*.status',
        onDocument: (doc: ESDocumentWithOperation<TFields>) => {
          let action: SynthtraceESAction;
          count++;

          if (count % 100000 === 0) {
            this.logger.debug(`Indexed ${count} documents`);
          } else if (count % 1000 === 0) {
            this.logger.verbose(`Indexed ${count} documents`);
          }

          if (doc._action) {
            action = doc._action!;
            delete doc._action;
          } else if (doc._index) {
            action = { create: { _index: doc._index, dynamic_templates: doc._dynamicTemplates } };
            delete doc._index;
            if (doc._dynamicTemplates) {
              delete doc._dynamicTemplates;
            }
          } else {
            this.logger.debug(doc);
            throw new Error(
              `Could not determine operation: _index and _action not defined in document`
            );
          }

          return action;
        },
        onDrop: (doc) => {
          this.logger.error(`Dropped document: ${JSON.stringify(doc, null, 2)}`);
        },
      },
      {
        headers: {
          'user-agent': 'synthtrace',
        },
      }
    );

    this.logger.info(`Produced ${count} events`);

    if (this.refreshAfterIndex) {
      await this.refresh();
    }
  }

  getAllIndices() {
    return this.dataStreams.concat(this.indices);
  }
}

function isKibanaClientConfig(input: KibanaClient | { target: string }): input is {
  target: string;
  username?: string;
  password?: string;
  apiKey?: string;
} {
  return !(input instanceof KibanaClient);
}
