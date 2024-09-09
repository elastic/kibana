/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { pipeline, Readable } from 'stream';
import { LogDocument } from '@kbn/apm-synthtrace-client/src/lib/logs';
import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { indexTemplates, IndexTemplateName } from './custom_logsdb_index_templates';
import { getRoutingTransform } from '../shared/data_stream_get_routing_transform';

export type LogsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

export class LogsSynthtraceEsClient extends SynthtraceEsClient<LogDocument> {
  constructor(options: { client: Client; logger: Logger } & LogsSynthtraceEsClientOptions) {
    super({
      ...options,
      pipeline: logsPipeline(),
    });
    this.dataStreams = ['logs-*-*'];
    this.indices = ['cloud-logs-*-*'];
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

  async createIndex(index: string, mappings?: MappingTypeMapping) {
    try {
      const isIndexExisting = await this.client.indices.exists({ index });

      if (isIndexExisting) {
        this.logger.info(`Index already exists: ${index}`);
        return;
      }

      await this.client.indices.create({ index, mappings });

      this.logger.info(`Index successfully created: ${index}`);
    } catch (err) {
      this.logger.error(`Index creation failed: ${index} - ${err.message}`);
    }
  }
}

function logsPipeline() {
  return (base: Readable) => {
    return pipeline(
      base,
      getSerializeTransform<LogDocument>(),
      getRoutingTransform('logs'),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
