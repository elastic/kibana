/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient } from '@kbn/scout';
import { errors } from '@elastic/elasticsearch';
import { METRICS_TEST_DATA_STREAM_NAME, METRICS_TEST_DATA_STREAM_TEMPLATE } from '../constants';
import {
  DEFAULT_CONFIG,
  TEST_TIME_ANCHOR,
  TIME_OFFSETS,
  buildDocument,
  buildMappingProperties,
  type MetricsIndexConfig,
} from './metrics_tsdb_index';

/**
 * Creates a TSDB data stream with an index template and metric fields
 * detected by Metrics Experience.
 */
export async function createMetricsDataStream(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG
): Promise<void> {
  const routingPath = config.dimensions.map((d) => d.name);

  await esClient.indices.putIndexTemplate({
    name: METRICS_TEST_DATA_STREAM_TEMPLATE,
    index_patterns: [METRICS_TEST_DATA_STREAM_NAME],
    priority: 2000,
    data_stream: {},
    template: {
      settings: {
        'index.mode': 'time_series',
        'index.routing_path': routingPath,
      },
      mappings: { properties: buildMappingProperties(config) },
    },
  });
}

/**
 * Inserts sample documents into the metrics data stream using `create` actions.
 * Uses TEST_TIME_ANCHOR as base time so documents always fall within the TSDB
 * backing index time window regardless of when the tests run.
 */
async function insertDataStreamDocuments(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG,
  count: number = 10
): Promise<void> {
  const baseTime = TEST_TIME_ANCHOR - TIME_OFFSETS.DATA_STREAM_DOCS_BASE;

  const operations = Array.from({ length: count }).flatMap((_, i) => [
    { create: { _index: METRICS_TEST_DATA_STREAM_NAME } },
    buildDocument(i, baseTime, config),
  ]);

  await esClient.bulk({ operations, refresh: true });
}

/**
 * Creates the metrics data stream and inserts documents only if it does not already exist.
 *
 * Includes a defensive catch for `resource_already_exists_exception` to handle the race
 * condition where parallel Playwright setup projects may attempt to create the same
 * resources concurrently.
 */
export async function createMetricsDataStreamIfNeeded(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG
): Promise<boolean> {
  const exists = await esClient.indices.exists({ index: METRICS_TEST_DATA_STREAM_NAME });
  if (exists) {
    return false;
  }

  try {
    await createMetricsDataStream(esClient, config);
    await insertDataStreamDocuments(esClient, config);
    return true;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.body?.error?.type === 'resource_already_exists_exception'
    ) {
      return false;
    }
    throw error;
  }
}
