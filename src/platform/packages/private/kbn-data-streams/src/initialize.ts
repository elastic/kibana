/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import invariant from 'node:assert';
import type api from '@elastic/elasticsearch/lib/api/types';
import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { defaultsDeep } from 'lodash';
import type { Logger } from '@kbn/logging';
import { retryEs } from './retry_es';
import type { DataStreamDefinition } from './types';
import { defaultDataStreamDefinition } from './constants';

function applyDefaults(def: DataStreamDefinition<any, any>): DataStreamDefinition<any, any> {
  return defaultsDeep(def, defaultDataStreamDefinition());
}

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export async function initialize({
  logger,
  dataStream,
  elasticsearchClient,
}: {
  logger: Logger;
  dataStream: DataStreamDefinition<any, any, any>;
  elasticsearchClient: ElasticsearchClient;
}) {
  logger = logger.get('data-streams-setup');
  logger.debug(`Setting up index template for data stream: ${dataStream.name}`);

  if (!dataStream.name) {
    throw new Error('Data stream name is required');
  }

  let existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
  try {
    ({
      index_templates: [existingIndexTemplate],
    } = await retryEs(() =>
      elasticsearchClient.indices.getIndexTemplate({
        name: dataStream.name,
      })
    ));
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      // Index template does not exist, we will create it
    } else {
      throw error;
    }
  }

  const version = dataStream.version;
  const previousVersions: number[] = [];
  dataStream = applyDefaults(dataStream);

  if (existingIndexTemplate) {
    const deployedVersion = existingIndexTemplate.index_template?._meta?.version;
    invariant(
      typeof deployedVersion === 'number' && deployedVersion > 0,
      `Datastream ${dataStream.name} metadata is in an unexpected state, expected version to be a number but got ${deployedVersion}`
    );

    if (deployedVersion >= version) {
      return; // already applied our mappings etc.
    }
    previousVersions.push(
      deployedVersion,
      ...existingIndexTemplate.index_template?._meta?.previousVersions
    );
  }

  // Should be idempotent
  await retryEs(() =>
    elasticsearchClient.indices.putIndexTemplate({
      name: dataStream.name,
      priority: dataStream.template.priority,
      index_patterns: [`${dataStream.name}*`],
      composed_of: dataStream.template.composedOf,
      data_stream: {
        hidden: dataStream.hidden,
      },
      template: {
        aliases: dataStream.template.aliases,
        mappings: dataStream.template.mappings,
        settings: dataStream.template.settings,
      },
      _meta: {
        ...dataStream.template._meta,
        version,
        previousVersions,
      },
    })
  );

  let existingDataStream: api.IndicesDataStream | undefined;
  try {
    ({
      data_streams: [existingDataStream],
    } = await retryEs(() => elasticsearchClient.indices.getDataStream({ name: dataStream.name })));
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      // Data stream does not exist, we will create it
    } else {
      throw error;
    }
  }

  if (!existingDataStream) {
    logger.debug(`Creating data stream: ${dataStream.name}`);
    try {
      await retryEs(() =>
        elasticsearchClient.indices.createDataStream({
          name: dataStream.name,
        })
      );
    } catch (error) {
      if (
        error instanceof EsErrors.ResponseError &&
        error.statusCode === 400 &&
        error.body?.error.type === 'resource_already_exists_exception'
      ) {
        // Data stream already exists, we can ignore this error, probably racing another create call
        logger.debug(`Data stream already exists: ${dataStream.name}`);
      } else {
        throw error;
      }
    }
  } else {
    logger.debug(
      `Data stream already exists: ${dataStream.name}, applying mappings to write index`
    );

    // https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream#operation-indices-get-data-stream-200-body-application-json-data_streams-indices
    // The last item in this array contains information about the stream’s current write index.
    const { indices } = existingDataStream;
    const writeIndex = indices[indices.length - 1];
    if (!writeIndex) {
      logger.debug(
        `Data stream ${dataStream.name} has no write index yet, cannot apply mappings or settings.`
      );
      return;
    } else {
      const {
        template: { mappings },
      } = await retryEs(() =>
        elasticsearchClient.indices.simulateIndexTemplate({ name: dataStream.name })
      );
      logger.debug(`Applying mappings to write index: ${writeIndex}`);
      await retryEs(() =>
        elasticsearchClient.indices.putMapping({
          index: writeIndex.index_name,
          ...mappings,
        })
      );
    }
  }
}
