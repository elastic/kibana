/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable, Transform, pipeline } from 'stream';
import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { Required } from 'utility-types';
import { Condition, StreamUpsertRequest } from '@kbn/streams-schema';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { internalKibanaHeaders } from '../shared/client_headers';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StreamsDocument {}

export class StreamsSynthtraceClient extends SynthtraceEsClient<StreamsDocument> {
  constructor(options: Required<Omit<SynthtraceEsClientOptions, 'pipeline'>, 'kibana'>) {
    super({
      ...options,
      pipeline: streamsPipeline(),
    });
    this.dataStreams = ['logs', 'logs.*'];
  }

  async forkStream(
    streamName: string,
    request: { stream: { name: string }; if: Condition }
  ): Promise<{ acknowledged: true }> {
    return this.kibana!.fetch(`/api/streams/${streamName}/_fork`, {
      method: 'POST',
      headers: {
        ...internalKibanaHeaders(),
      },
      body: JSON.stringify(request),
    });
  }

  async putStream(
    streamName: string,
    request: StreamUpsertRequest
  ): Promise<{ acknowledged: true; result: 'created' | 'updated' }> {
    return this.kibana!.fetch(`/api/streams/${streamName}`, {
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
    await this.kibana!.fetch('/api/streams/_disable', {
      method: 'POST',
      headers: {
        ...internalKibanaHeaders(),
      },
    });
  }

  override async clean(): Promise<void> {
    await this.disable();
    await super.clean();
  }
}

function streamsRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<StreamsDocument>, encoding, callback) {
      document._index = 'logs';
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
