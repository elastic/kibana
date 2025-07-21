/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { Condition, Streams } from '@kbn/streams-schema';
import { Readable, Transform, pipeline } from 'stream';
import { Required } from 'utility-types';
import {
  SynthtraceEsClientBase,
  SynthtraceEsClient,
  SynthtraceEsClientOptions,
} from '../shared/base_client';
import { internalKibanaHeaders } from '../shared/client_headers';
import { getSerializeTransform } from '../shared/get_serialize_transform';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StreamsDocument {}

export interface StreamsSynthtraceClient extends SynthtraceEsClient<StreamsDocument> {
  forkStream(
    streamName: string,
    request: { stream: { name: string }; if: Condition }
  ): Promise<{ acknowledged: true }>;
  putStream(
    streamName: string,
    request: Streams.all.UpsertRequest
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  clearESCache(): Promise<void>;
}

export class StreamsSynthtraceClientImpl
  extends SynthtraceEsClientBase<StreamsDocument>
  implements StreamsSynthtraceClient
{
  constructor(options: Required<Omit<SynthtraceEsClientOptions, 'pipeline'>, 'kibana'>) {
    super({
      ...options,
      pipeline: streamsPipeline(),
    });
    this.dataStreams = ['logs', 'logs.*', 'logs-generic-default'];
  }

  async forkStream(
    streamName: string,
    request: { stream: { name: string }; if: Condition }
  ): Promise<{ acknowledged: true }> {
    return this.kibana.fetch(`/api/streams/${streamName}/_fork`, {
      method: 'POST',
      headers: {
        ...internalKibanaHeaders(),
      },
      body: JSON.stringify(request),
    });
  }

  async putStream(
    streamName: string,
    request: Streams.all.UpsertRequest
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }> {
    return this.kibana.fetch(`/api/streams/${streamName}`, {
      method: 'PUT',
      headers: {
        ...internalKibanaHeaders(),
      },
      body: JSON.stringify(request),
    });
  }

  async enable() {
    await this.kibana!.fetch('/api/streams/_enable', {
      method: 'POST',
      headers: {
        ...internalKibanaHeaders(),
      },
    });
  }

  async disable() {
    await this.kibana.fetch('/api/streams/_disable', {
      method: 'POST',
      timeout: 5 * 60 * 1000,
      headers: {
        ...internalKibanaHeaders(),
      },
    });
  }

  override async clean(): Promise<void> {
    await this.disable();
    await super.clean();
  }

  async clearESCache(): Promise<void> {
    await this.client.indices.clearCache();
  }
}

function streamsRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<StreamsDocument>, encoding, callback) {
      // 50-50 send to logs or to logs-generic-default
      if (Math.random() > 0.5) {
        document._index = 'logs-generic-default';
      } else {
        document._index = 'logs';
      }
      callback(null, document);
    },
  });
}

function streamsPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<StreamsDocument>(),
      streamsRoutingTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
