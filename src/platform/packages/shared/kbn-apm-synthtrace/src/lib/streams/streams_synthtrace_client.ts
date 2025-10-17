/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import type { Streams } from '@kbn/streams-schema';
import type { Readable } from 'stream';
import { Transform, pipeline } from 'stream';
import type { Required } from 'utility-types';
import type { Condition } from '@kbn/streamlang';
import type { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { SynthtraceEsClientBase } from '../shared/base_client';
import { internalKibanaHeaders } from '../shared/client_headers';
import { getSerializeTransform } from '../shared/get_serialize_transform';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StreamsDocument {}

export interface StreamsSynthtraceClient extends SynthtraceEsClient<StreamsDocument> {
  forkStream(
    streamName: string,
    request: { stream: { name: string }; where: Condition }
  ): Promise<{ acknowledged: true }>;
  putStream(
    streamName: string,
    request: Streams.all.UpsertRequest
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }>;
  putIngestStream(
    streamName: string,
    request: Streams.all.Definition
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }>;
  enableFailureStore(streamName: string): Promise<unknown>;
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
    request: { stream: { name: string }; where: Condition }
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

  async putIngestStream(
    streamName: string,
    request: Streams.all.Definition
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }> {
    return this.kibana.fetch(`/api/streams/${streamName}/_ingest`, {
      method: 'PUT',
      headers: {
        ...internalKibanaHeaders(),
      },
      body: JSON.stringify(request),
    });
  }

  async enableFailureStore(streamName: string) {
    return this.client.indices.putDataStreamOptions({
      name: streamName,
      failure_store: {
        enabled: true,
      },
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
      if (!document._index) {
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
