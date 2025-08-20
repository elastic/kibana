/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import objectHash from 'object-hash';
import pLimit from 'p-limit';
import type api from '@elastic/elasticsearch/lib/api/types';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { defaultsDeep } from 'lodash';
import { retryEs } from './retry_es';
import type { DataStreamClientArgs } from './client';
import type { AnyDataStreamDefinition } from './types';
import { defaultDataStreamDefinition } from './constants';

function applyDefaults(def: AnyDataStreamDefinition): AnyDataStreamDefinition {
  return defaultsDeep(def, defaultDataStreamDefinition());
}

/**
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 *
 * Endeavour to be idempotent and race-condition safe.
 */
export async function initialize({
  logger,
  dataStreams,
  elasticsearchClient,
}: DataStreamClientArgs<any>) {
  logger = logger.get('data-streams-setup');
  logger.debug(`Setting up index template for data stream: ${dataStreams.name}`);

  let existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
  try {
    ({
      index_templates: [existingIndexTemplate],
    } = await retryEs(() =>
      elasticsearchClient.indices.getIndexTemplate({
        name: dataStreams.name,
      })
    ));
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      // Index template does not exist, we will create it
    } else {
      throw error;
    }
  }

  const previousVersions: string[] = [];
  dataStreams = applyDefaults(dataStreams);
  const nextHash = objectHash(dataStreams);

  if (existingIndexTemplate && existingIndexTemplate.index_template?._meta?.version !== nextHash) {
    if (existingIndexTemplate.index_template?._meta?.version) {
      previousVersions.push(existingIndexTemplate.index_template._meta.version);
    }
    if (existingIndexTemplate.index_template?._meta?.previousVersions) {
      previousVersions.push(...existingIndexTemplate.index_template?._meta?.previousVersions);
    }
  }

  // Should be idempotent
  await retryEs(() =>
    elasticsearchClient.indices.putIndexTemplate({
      name: dataStreams.name,
      priority: dataStreams.template.priority,
      index_patterns: [`${dataStreams.name}*`],
      composed_of: dataStreams.template.composedOf,
      data_stream: {
        hidden: dataStreams.hidden,
      },
      template: {
        ...dataStreams.template,
      },
      _meta: {
        ...dataStreams.template._meta,
        version: nextHash,
        previousVersions,
      },
    })
  );

  let existingDataStream: api.IndicesDataStream | undefined;
  try {
    ({
      data_streams: [existingDataStream],
    } = await retryEs(() => elasticsearchClient.indices.getDataStream({ name: dataStreams.name })));
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      // Data stream does not exist, we will create it
    } else {
      throw error;
    }
  }

  if (!existingDataStream) {
    logger.debug(`Creating data stream: ${dataStreams.name}`);
    try {
      await retryEs(() =>
        elasticsearchClient.indices.createDataStream({
          name: dataStreams.name,
        })
      );
    } catch (error) {
      if (
        error instanceof EsErrors.ResponseError &&
        error.statusCode === 400 &&
        error.body?.error.type === 'resource_already_exists_exception'
      ) {
        // Data stream already exists, we can ignore this error, probably racing another create call
        logger.debug(`Data stream already exists: ${dataStreams.name}`);
      } else {
        throw error;
      }
    }
  } else {
    logger.debug(
      `Data stream already exists: ${dataStreams.name}, applying mappings to write index`
    );

    // https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream#operation-indices-get-data-stream-200-body-application-json-data_streams-indices
    // The last item in this array contains information about the stream’s current write index.
    const { indices } = existingDataStream;
    const writeIndex = indices[indices.length - 1];
    if (!writeIndex) {
      logger.debug(
        `Data stream ${dataStreams.name} has no write index yet, cannot apply mappings or settings.`
      );
      return;
    } else {
      const {
        template: { mappings, settings },
      } = await retryEs(() =>
        elasticsearchClient.indices.simulateIndexTemplate({ name: dataStreams.name })
      );
      logger.debug(`Applying mappings to write index: ${writeIndex}`);
      await retryEs(() =>
        elasticsearchClient.indices.putMapping({
          index: writeIndex.index_name,
          ...mappings,
        })
      );

      const limit = pLimit(5);
      const promises: Promise<void>[] = [];

      for (const index of indices)
        promises.push(
          limit(async () => {
            logger.debug(`Applying settings to index: ${index}`);
            await retryEs(() =>
              elasticsearchClient.indices.putSettings({
                index: index.index_name,
                settings,
              })
            );
          })
        );

      const results = await Promise.allSettled(promises);

      const updateErrors: unknown[] = [];
      for (const result of results) {
        if (result.status === 'rejected') {
          updateErrors.push(result.reason);
        }
      }
      if (updateErrors.length) {
        throw new Error(updateErrors.map((e) => String(e)).join('\n'));
      }
    }
  }
}
