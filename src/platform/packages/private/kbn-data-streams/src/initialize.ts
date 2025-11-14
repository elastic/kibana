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

  const version = dataStreams.version;
  const previousVersions: number[] = [];
  dataStreams = applyDefaults(dataStreams);

  if (existingIndexTemplate) {
    const deployedVersion = existingIndexTemplate.index_template?._meta?.version;
    invariant(
      typeof deployedVersion === 'number' && deployedVersion > 0,
      `Datastream metadata is in an unexpected state, expected version to be a number but got ${deployedVersion}`
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
      name: dataStreams.name,
      priority: dataStreams.template.priority,
      index_patterns: [`${dataStreams.name}*`],
      composed_of: dataStreams.template.composedOf,
      data_stream: {
        hidden: dataStreams.hidden,
      },
      template: {
        aliases: dataStreams.template.aliases,
        mappings: dataStreams.template.mappings,
        settings: dataStreams.template.settings,
      },
      _meta: {
        ...dataStreams.template._meta,
        version,
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
        template: { mappings },
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
    }
  }
}
