/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import type { SearchIndexLogger, EsClient } from '../types';
import { newIndexTemplateRequest } from './index_template';
import { retry } from '../utils';
import { SearchIndexNames } from '../search_index_names';

export interface SearchIndexInitializerDependencies {
  names: SearchIndexNames;
  kibanaVersion: string;
  logger: SearchIndexLogger;
  esClient: Promise<EsClient>;
}

export class SearchIndexInitializer {
  constructor(private readonly deps: SearchIndexInitializerDependencies) {}

  public async initialize(): Promise<void> {
    const createdIndexTemplate = await retry(
      this.createIndexTemplateIfNotExists,
      'createIndexTemplateIfNotExists',
      this.deps.logger
    );

    if (createdIndexTemplate) {
      await retry(this.createIndex, 'createIndex', this.deps.logger);
    }
  }

  protected readonly createIndexTemplateIfNotExists = async (): Promise<boolean> => {
    const exists = await this.indexTemplateExists();
    if (exists) return false;
    return await this.createIndexTemplate();
  };

  protected async indexTemplateExists(): Promise<boolean> {
    try {
      const esClient = await this.deps.esClient;
      const name = this.deps.names.indexTemplate;
      const exists = await esClient.indices.existsIndexTemplate({ name });

      return !!exists;
    } catch (err) {
      throw new Error(`error checking existence of index template: ${err.message}`);
    }
  }

  protected async createIndexTemplate(): Promise<boolean> {
    try {
      const esClient = await this.deps.esClient;
      const { indexTemplate, indexPattern } = this.deps.names;
      const request = newIndexTemplateRequest({
        name: indexTemplate,
        indexPatterns: [indexPattern],
        kibanaVersion: this.deps.kibanaVersion,
      });

      await esClient.indices.putIndexTemplate(request);

      return true;
    } catch (err) {
      // The error message doesn't have a type attribute we can look to guarantee it's due
      // to the template already existing (only long message) so we'll check ourselves to see
      // if the template now exists. This scenario would happen if you startup multiple Kibana
      // instances at the same time.
      const exists = await this.indexTemplateExists();

      if (exists) return false;

      const error = new Error(`error creating index template: ${err.message}`);
      Object.assign(error, { wrapped: err });
      throw error;
    }
  }

  protected readonly createIndex = async (): Promise<void> => {
    const esClient = await this.deps.esClient;
    const { index } = this.deps.names;

    try {
      await esClient.indices.create({ index });
    } catch (error) {
      const alreadyExists =
        (error as errors.ResponseError)?.body?.error?.type === 'resource_already_exists_exception';

      if (alreadyExists) return;

      throw error;
    }
  };
}
