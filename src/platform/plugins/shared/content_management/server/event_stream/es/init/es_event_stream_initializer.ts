/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pRetry from 'p-retry';
import { errors } from '@elastic/elasticsearch';
import type { EsClient } from '../types';
import type { EsEventStreamNames } from '../es_event_stream_names';
import type { EventStreamLogger } from '../../types';
import { newIndexTemplateRequest } from './index_template';

export interface EsEventStreamInitializerDependencies {
  names: EsEventStreamNames;
  kibanaVersion: string;
  logger: EventStreamLogger;
  esClient: Promise<EsClient>;
}

export class EsEventStreamInitializer {
  constructor(private readonly deps: EsEventStreamInitializerDependencies) {}

  public async initialize(): Promise<void> {
    const createdIndexTemplate = await this.#retry(
      this.createIndexTemplateIfNotExists,
      'createIndexTemplateIfNotExists'
    );

    if (createdIndexTemplate) {
      await this.#retry(this.createDataStream, 'createDataStream');
    }
  }

  /**
   * Calls a function; retries calling it multiple times via p-retry, if it fails.
   * Should retry on 2s, 4s, 8s, 16s.
   *
   * See: https://github.com/tim-kos/node-retry#retryoperationoptions
   *
   * @param fn Function to retry, if it fails.
   */
  readonly #retry = async <R>(fn: () => Promise<R>, fnName: string): Promise<R> => {
    this.deps.logger.debug(`Event Stream initialization operation: ${fnName}`);

    return await pRetry(fn, {
      minTimeout: 1000,
      maxTimeout: 1000 * 60 * 3,
      retries: 4,
      factor: 2,
      randomize: true,
      onFailedAttempt: (err) => {
        const message =
          `Event Stream initialization operation failed and will be retried: ${fnName};` +
          `${err.retriesLeft} more times; error: ${err.message}`;

        this.deps.logger.warn(message);
      },
    });
  };

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

  protected readonly createDataStream = async (): Promise<void> => {
    const esClient = await this.deps.esClient;
    const name = this.deps.names.dataStream;

    try {
      await esClient.indices.createDataStream({
        name,
      });
    } catch (error) {
      const alreadyExists =
        (error as errors.ResponseError)?.body?.error?.type === 'resource_already_exists_exception';

      if (alreadyExists) return;

      throw error;
    }
  };
}
