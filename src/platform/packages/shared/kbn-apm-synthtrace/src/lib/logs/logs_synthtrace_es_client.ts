/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client, estypes } from '@elastic/elasticsearch';
import { pipeline, Readable } from 'stream';
import { LogDocument } from '@kbn/apm-synthtrace-client/src/lib/logs';
import { IngestProcessorContainer, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { ValuesType } from 'utility-types';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../shared/base_client';
import { getSerializeTransform } from '../shared/get_serialize_transform';
import { Logger } from '../utils/create_logger';
import { indexTemplates, IndexTemplateName } from './custom_logsdb_index_templates';
import { getRoutingTransform } from '../shared/data_stream_get_routing_transform';

export const LogsIndex = 'logs';
export const LogsCustom = 'logs@custom';

export type LogsSynthtraceEsClientOptions = Omit<SynthtraceEsClientOptions, 'pipeline'>;

interface Pipeline {
  includeSerialization?: boolean;
}

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

  async deleteIndexTemplate(name: IndexTemplateName) {
    try {
      await this.client.indices.deleteIndexTemplate({ name });
      this.logger.info(`Index template successfully deleted: ${name}`);
    } catch (err) {
      this.logger.error(`Index template deletion failed: ${name} - ${err.message}`);
    }
  }

  async createComponentTemplate({
    name,
    mappings,
    dataStreamOptions,
  }: {
    name: string;
    mappings?: MappingTypeMapping;
    dataStreamOptions?: {
      failure_store: {
        enabled: boolean;
      };
    };
  }) {
    const isTemplateExisting = await this.client.cluster.existsComponentTemplate({ name });

    if (isTemplateExisting) return this.logger.info(`Component template already exists: ${name}`);

    try {
      await this.client.cluster.putComponentTemplate({
        name,
        template: {
          ...((mappings && { mappings }) || {}),
          ...((dataStreamOptions && { data_stream_options: dataStreamOptions }) || {}),
        },
      });
      this.logger.info(`Component template successfully created: ${name}`);
    } catch (err) {
      this.logger.error(`Component template creation failed: ${name} - ${err.message}`);
    }
  }

  async deleteComponentTemplate(name: string) {
    try {
      await this.client.cluster.deleteComponentTemplate({ name });
      this.logger.info(`Component template successfully deleted: ${name}`);
    } catch (err) {
      this.logger.error(`Component template deletion failed: ${name} - ${err.message}`);
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

  async updateIndexTemplate(
    indexName: string,
    modify: (
      template: ValuesType<
        estypes.IndicesGetIndexTemplateResponse['index_templates']
      >['index_template']
    ) => estypes.IndicesPutIndexTemplateRequest
  ) {
    try {
      const response = await this.client.indices.getIndexTemplate({
        name: indexName,
      });

      await Promise.all(
        response.index_templates.map((template) => {
          return this.client.indices.putIndexTemplate({
            ...modify(template.index_template),
            name: template.name,
          });
        })
      );

      this.logger.info(`Updated ${indexName} index template`);
    } catch (err) {
      this.logger.error(`Update index template failed: ${indexName} - ${err.message}`);
    }
  }

  async createCustomPipeline(processors: IngestProcessorContainer[], id = LogsCustom) {
    try {
      this.client.ingest.putPipeline({
        id,
        processors,
        version: 1,
      });
      this.logger.info(`Custom pipeline created: ${id}`);
    } catch (err) {
      this.logger.error(`Custom pipeline creation failed: ${id} - ${err.message}`);
    }
  }

  async deleteCustomPipeline(id = LogsCustom) {
    try {
      this.client.ingest.deletePipeline({
        id,
      });
      this.logger.info(`Custom pipeline deleted: ${id}`);
    } catch (err) {
      this.logger.error(`Custom pipeline deletion failed: ${id} - ${err.message}`);
    }
  }

  getDefaultPipeline({ includeSerialization }: Pipeline = { includeSerialization: true }) {
    return logsPipeline({ includeSerialization });
  }
}

function logsPipeline({ includeSerialization }: Pipeline = { includeSerialization: true }) {
  return (base: Readable) => {
    const serializationTransform = includeSerialization
      ? [getSerializeTransform<LogDocument>()]
      : [];

    return pipeline(
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      base,
      ...serializationTransform,
      getRoutingTransform('logs'),
      (err: unknown) => {
        if (err) {
          throw err;
        }
      }
    );
  };
}
