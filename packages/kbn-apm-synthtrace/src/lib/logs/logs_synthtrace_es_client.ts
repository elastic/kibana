/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ESDocumentWithOperation } from '@kbn/apm-synthtrace-client';
import { pipeline, Readable, Transform } from 'stream';
import { LogDocument } from '@kbn/apm-synthtrace-client/src/lib/logs';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { indexTemplates, IndexTemplateName } from './custom_logsdb_index_templates';

export type LogsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class LogsSynthtraceEsClient extends SynthtraceEsClient<LogDocument> {
  constructor(options: { client: Client; logger: Logger } & LogsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: logsPipeline(),
    });
    this.dataStreams = ['logs-*-*'];
  }

  async createIndexTemplate(name: IndexTemplateName) {
    const isTemplateExisting = await this.client.indices.existsIndexTemplate({ name });

    if (isTemplateExisting) return this.logger.info(`Index template already exists: ${name}`);

    const template = indexTemplates[name];

    try {
      await this.client.indices.putIndexTemplate(template);
      this.logger.info(`Index template successfully created: ${name}`);
    } catch (err) {
      this.logger.error(`Index template creation failed: ${name} - ${err.message}`);
    }
  }
}

function logsPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<LogDocument>(),
      getRoutingTransform(),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}

function getRoutingTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<LogDocument>, encoding, callback) {
      if (
        'data_stream.type' in document &&
        'data_stream.dataset' in document &&
        'data_stream.namespace' in document
      ) {
        document._index = `${document['data_stream.type']}-${document['data_stream.dataset']}-${document['data_stream.namespace']}`;
      } else {
        throw new Error('Cannot determine index for event');
      }

      callback(null, document);
    },
  });
}
