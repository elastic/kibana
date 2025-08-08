/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type Logger } from '@kbn/core/server';
import {
  ErrorResponseBase,
  MsearchMultiSearchResult,
  MsearchRequestItem,
} from '@elastic/elasticsearch/lib/api/types';
import { joinArrayValues } from './join_array_values';
import { DataStreamFieldCapsMap, Dimension, MetricField } from '../types';
import { extractDimensions } from './extract_dimensions';

export type SampleMetricDocumentsResults = Promise<Map<string, string[]>>;

function isErrorResponseBase(subject: any): subject is ErrorResponseBase {
  return subject.error != null;
}

function processSampleMetricDocuments(
  response: MsearchMultiSearchResult<{ fields: Record<string, any> }>,
  metricFields: MetricField[],
  logger: Logger
) {
  const metricsDocumentMap = new Map<string, string[]>();

  // Process responses for each metric
  for (let i = 0; i < metricFields.length; i++) {
    const metricName = metricFields[i].name;
    const searchResult = response.responses[i];
    if (isErrorResponseBase(searchResult)) {
      logger.error(`Error sampling document for metric ${metricName}: ${searchResult.error}`);
      metricsDocumentMap.set(metricName, []);
      continue;
    }
    if (searchResult && searchResult.hits.hits?.length > 0) {
      const fields = searchResult.hits.hits[0].fields;
      const actualDimensions = joinArrayValues(fields);
      metricsDocumentMap.set(metricName, Object.keys(actualDimensions));
    }
  }

  return metricsDocumentMap;
}

export async function sampleMetricDocuments({
  esClient,
  metricFields,
  logger,
}: {
  esClient: ElasticsearchClient;
  metricFields: MetricField[];
  logger: Logger;
}): SampleMetricDocumentsResults {
  if (metricFields.length === 0) {
    return new Map();
  }

  try {
    const body: MsearchRequestItem[] = [];
    for (const { name: field, index, dimensions } of metricFields) {
      body.push({ index });
      // Body for each search
      body.push({
        size: 1,
        terminate_after: 1,
        query: {
          exists: {
            field,
          },
        },
        _source: true,
        fields: dimensions.map((dimension) => dimension.name),
      });
    }
    const response = await esClient.msearch<{ fields: Record<string, any> }>({ body });
    return processSampleMetricDocuments(response, metricFields, logger);
  } catch (error) {
    const metricsDocumentMap = new Map<string, string[]>();
    for (const { name } of metricFields) {
      metricsDocumentMap.set(name, []);
    }
    return metricsDocumentMap;
  }
}

export async function sampleAndProcessMetricFields({
  esClient,
  metricFields,
  dataStreamFieldCapsMap,
  logger,
}: {
  esClient: ElasticsearchClient;
  metricFields: MetricField[];
  dataStreamFieldCapsMap: DataStreamFieldCapsMap;
  logger: Logger;
}) {
  if (metricFields.length === 0) {
    return metricFields;
  }

  const metricDimensionsMap = await sampleMetricDocuments({
    esClient,
    metricFields,
    logger,
  });

  // Pre-compute all unique dimension field combinations to avoid repeated extraction
  const uniqueDimensionSets = new Map<string, Array<Dimension>>();

  // Update dimensions based on actual sampled documents
  for (const field of metricFields) {
    // Get the sampled document fields for this metric
    const actualFields = metricDimensionsMap.get(field.name) || [];
    const fieldCaps = dataStreamFieldCapsMap.get(field.index);

    if (actualFields.length > 0) {
      // Create cache key from sorted field names
      const cacheKey = actualFields.sort().join(',');

      // Check if we've already computed dimensions for this field combination
      if (!uniqueDimensionSets.has(cacheKey) && fieldCaps) {
        uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, actualFields));
      }
      field.dimensions = uniqueDimensionSets.get(cacheKey)!;
      field.no_data = false;
    } else {
      // No sample documents found - set no_data flag
      field.no_data = true;
    }
  }

  return metricFields;
}
