/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { retryTransientEsErrors } from './retry_transient_es_errors';

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexNames: string[];
  totalFieldsLimit: number;
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexName: string;
  totalFieldsLimit: number;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  indexName,
  totalFieldsLimit,
}: UpdateIndexOpts) => {
  logger.debug(`Updating total field limit setting for ${indexName} data stream.`);

  try {
    const body = { 'index.mapping.total_fields.limit': totalFieldsLimit };
    await retryTransientEsErrors(() => esClient.indices.putSettings({ index: indexName, body }), {
      logger,
    });
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for ${indexName}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateMapping = async ({ logger, esClient, indexName }: UpdateIndexOpts) => {
  logger.debug(`Updating mappings for ${indexName} data stream.`);

  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: indexName }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for ${indexName}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for ${indexName}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index: indexName, body: simulatedMapping }),
      { logger }
    );
  } catch (err) {
    logger.error(`Failed to PUT mapping for ${indexName}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the data stream mapping and total field limit setting
 */
const updateDataStreamMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  indexNames,
}: UpdateIndexMappingsOpts) => {
  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    indexNames.map((indexName) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, indexName })
    )
  );
  // Update mappings of the found indices.
  await Promise.all(
    indexNames.map((indexName) => updateMapping({ logger, esClient, totalFieldsLimit, indexName }))
  );
};

export interface CreateOrUpdateDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
}

export async function createOrUpdateDataStream({
  logger,
  esClient,
  name,
  totalFieldsLimit,
}: CreateOrUpdateDataStreamParams): Promise<void> {
  logger.info(`Creating data stream - ${name}`);

  // check if data stream exists
  let dataStreamExists = false;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreamExists = response.data_streams.length > 0;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }

  // if a data stream exists, update the underlying mapping
  if (dataStreamExists) {
    await updateDataStreamMappings({
      logger,
      esClient,
      indexNames: [name],
      totalFieldsLimit,
    });
  } else {
    try {
      await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating data stream ${name} - ${error.message}`);
        throw error;
      }
    }
  }
}

export interface CreateDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}

export async function createDataStream({
  logger,
  esClient,
  name,
}: CreateDataStreamParams): Promise<void> {
  logger.info(`Creating data stream - ${name}`);

  // check if data stream exists
  let dataStreamExists = false;
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreamExists = response.data_streams.length > 0;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }

  // return if data stream already created
  if (dataStreamExists) {
    return;
  }

  try {
    await retryTransientEsErrors(() => esClient.indices.createDataStream({ name }), { logger });
  } catch (error) {
    if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
      logger.error(`Error creating data stream ${name} - ${error.message}`);
      throw error;
    }
  }
}

export interface CreateOrUpdateSpacesDataStreamParams {
  name: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
}

export async function updateDataStreams({
  logger,
  esClient,
  name,
  totalFieldsLimit,
}: CreateOrUpdateSpacesDataStreamParams): Promise<void> {
  logger.info(`Updating data streams - ${name}`);

  // check if data stream exists
  let dataStreams: IndicesDataStream[] = [];
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name, expand_wildcards: 'all' }),
      { logger }
    );
    dataStreams = response.data_streams;
  } catch (error) {
    if (error?.statusCode !== 404) {
      logger.error(`Error fetching data stream for ${name} - ${error.message}`);
      throw error;
    }
  }
  if (dataStreams.length > 0) {
    await updateDataStreamMappings({
      logger,
      esClient,
      totalFieldsLimit,
      indexNames: dataStreams.map((dataStream) => dataStream.name),
    });
  }
}
