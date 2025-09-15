/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Logger } from '@kbn/core/server';
import type { ErrorResponseBase, MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { estypes } from '@elastic/elasticsearch';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { DataStreamFieldCapsMap } from '../../types';
import type { Dimension, MetricField } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';

export type SampleMetricDocumentsResults = Promise<Map<string, string[]>>;

function isErrorResponseBase(subject: any): subject is ErrorResponseBase {
  return subject.error != null;
}

function getDimensionsByMetricFieldMap(
  response: {
    responses: InferSearchResponseOf<
      {
        fields: Record<string, any>;
      },
      estypes.MsearchRequest
    >[];
  },
  metricFields: MetricField[],
  logger: Logger
) {
  // Process responses for each metric
  const dimensionsByMetricField = new Map<string, string[]>(
    metricFields.map(({ name }, index) => {
      const searchResult = response.responses[index];

      if (isErrorResponseBase(searchResult)) {
        logger.error(`Error sampling document for metric ${name}: ${searchResult.error}`);
        return [name, []];
      }

      if (searchResult?.hits.hits?.length) {
        const fields = searchResult.hits.hits[0].fields ?? {};
        return [name, Object.keys(fields)];
      }

      return [name, []];
    })
  );

  return dimensionsByMetricField;
}

export async function getSampleMetricsWithDimensions({
  esClient,
  metricFields,
  logger,
}: {
  esClient: TracedElasticsearchClient;
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
        _source: false,
        fields: dimensions.map((dimension) => dimension.name),
      });
    }
    const response = await esClient.msearch<{ fields: Record<string, any> }>(
      'sample_metrics_documents',
      { body }
    );

    return getDimensionsByMetricFieldMap(response, metricFields, logger);
  } catch (error) {
    const dimensionsByMetricFieldMap = new Map<string, string[]>();
    for (const { name } of metricFields) {
      dimensionsByMetricFieldMap.set(name, []);
    }
    return dimensionsByMetricFieldMap;
  }
}

export async function sampleAndProcessMetricFields({
  esClient,
  metricFields,
  dataStreamFieldCapsMap,
  logger,
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  dataStreamFieldCapsMap: DataStreamFieldCapsMap;
  logger: Logger;
}) {
  if (metricFields.length === 0) {
    return metricFields;
  }

  const dimensionsByMetricMap = await getSampleMetricsWithDimensions({
    esClient,
    metricFields,
    logger,
  });

  // Pre-compute all unique dimension field combinations to avoid repeated extraction
  const uniqueDimensionSets = new Map<string, Array<Dimension>>();

  return metricFields.map((field) => {
    // Get the sampled document fields for this metric
    const dimensionFieldNames = dimensionsByMetricMap.get(field.name) || [];
    const fieldCaps = dataStreamFieldCapsMap.get(field.index);

    if (dimensionFieldNames.length > 0) {
      // Create cache key from sorted field names
      const cacheKey = [...dimensionFieldNames].sort().join(',');

      if (!uniqueDimensionSets.has(cacheKey) && fieldCaps) {
        uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, dimensionFieldNames));
      }

      return { ...field, dimensions: uniqueDimensionSets.get(cacheKey)!, noData: false };
    } else {
      return { ...field, dimensions: [], noData: true };
    }
  });
}
