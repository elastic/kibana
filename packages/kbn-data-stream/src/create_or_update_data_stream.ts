/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesSimulateIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface ConcreteIndexInfo {
  index: string;
  alias: string;
  isWriteIndex: boolean;
}

interface UpdateIndexMappingsOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  validIndexPrefixes?: string[];
  concreteIndices: ConcreteIndexInfo[];
}

interface UpdateIndexOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  totalFieldsLimit: number;
  concreteIndexInfo: ConcreteIndexInfo;
}

const updateTotalFieldLimitSetting = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndexInfo,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  try {
    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index,
          body: { 'index.mapping.total_fields.limit': totalFieldsLimit },
        }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Failed to PUT index.mapping.total_fields.limit settings for ${alias}: ${err.message}`
    );
    throw err;
  }
};

// This will update the mappings of backing indices but *not* the settings. This
// is due to the fact settings can be classed as dynamic and static, and static
// updates will fail on an index that isn't closed. New settings *will* be applied as part
// of the ILM policy rollovers. More info: https://github.com/elastic/kibana/pull/113389#issuecomment-940152654
const updateUnderlyingMapping = async ({
  logger,
  esClient,
  concreteIndexInfo,
}: UpdateIndexOpts) => {
  const { index, alias } = concreteIndexInfo;
  let simulatedIndexMapping: IndicesSimulateIndexTemplateResponse;
  try {
    simulatedIndexMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: index }),
      { logger }
    );
  } catch (err) {
    logger.error(
      `Ignored PUT mappings for ${alias}; error generating simulated mappings: ${err.message}`
    );
    return;
  }

  const simulatedMapping = get(simulatedIndexMapping, ['template', 'mappings']);

  if (simulatedMapping == null) {
    logger.error(`Ignored PUT mappings for ${alias}; simulated mappings were empty`);
    return;
  }

  try {
    await retryTransientEsErrors(
      () => esClient.indices.putMapping({ index, body: simulatedMapping }),
      { logger }
    );
  } catch (err) {
    logger.error(`Failed to PUT mapping for ${alias}: ${err.message}`);
    throw err;
  }
};
/**
 * Updates the underlying mapping for any existing concrete indices
 */
export const updateIndexMappings = async ({
  logger,
  esClient,
  totalFieldsLimit,
  concreteIndices,
  validIndexPrefixes,
}: UpdateIndexMappingsOpts) => {
  let validConcreteIndices = [];
  if (validIndexPrefixes) {
    for (const cIdx of concreteIndices) {
      if (!validIndexPrefixes?.some((prefix: string) => cIdx.index.startsWith(prefix))) {
        logger.warn(
          `Found unexpected concrete index name "${
            cIdx.index
          }" while expecting index with one of the following prefixes: [${validIndexPrefixes.join(
            ','
          )}] Not updating mappings or settings for this index.`
        );
      } else {
        validConcreteIndices.push(cIdx);
      }
    }
  } else {
    validConcreteIndices = concreteIndices;
  }

  logger.debug(
    `Updating underlying mappings for ${validConcreteIndices.length} indices / data streams.`
  );

  // Update total field limit setting of found indices
  // Other index setting changes are not updated at this time
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateTotalFieldLimitSetting({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
  );

  // Update mappings of the found indices.
  await Promise.all(
    validConcreteIndices.map((index) =>
      updateUnderlyingMapping({ logger, esClient, totalFieldsLimit, concreteIndexInfo: index })
    )
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
    await updateIndexMappings({
      logger,
      esClient,
      totalFieldsLimit,
      concreteIndices: [{ alias: name, index: name, isWriteIndex: true }],
    });
  } else {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.indices.createDataStream({
            name,
          }),
        { logger }
      );
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        logger.error(`Error creating data stream ${name} - ${error.message}`);
        throw error;
      }
    }
  }
}
