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
import { semconvFlat } from '@kbn/otel-semantic-conventions';
import { dateRangeQuery } from '@kbn/es-query';
import type { DataStreamFieldCapsMap, EpochTimeRange } from '../../types';
import type { Dimension, MetricField } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import { normalizeUnit } from './normalize_unit';

export interface MetricMetadata {
  dimensions: string[];
  unitFromSample?: string;
}
export type MetricMetadataMap = Map<string, MetricMetadata>;

function isErrorResponseBase(subject: unknown): subject is ErrorResponseBase {
  return typeof subject === 'object' && subject !== null && 'error' in subject;
}

export function generateMapKey(indexName: string, fieldName: string) {
  return `${fieldName}>${indexName}`;
}

function buildMetricMetadataMap(
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
): MetricMetadataMap {
  const entries = new Map<string, MetricMetadata>(
    metricFields.map(({ name, index: indexName }, index) => {
      const searchResult = response.responses[index];

      const mapKey = generateMapKey(indexName, name);

      if (isErrorResponseBase(searchResult)) {
        logger.error(`Error sampling document for metric ${name}: ${searchResult.error}`);
        return [mapKey, { dimensions: [] }];
      }

      if (!searchResult?.hits.hits?.length) {
        return [mapKey, { dimensions: [] }];
      }

      const fields = searchResult.hits.hits[0].fields ?? {};
      const { dimensions, unitFromSample } = Object.entries(fields).reduce<MetricMetadata>(
        (acc, [fieldName, fieldValue]) => {
          if (fieldName === semconvFlat.unit.name) {
            const value = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;

            if (typeof value === 'string') {
              acc.unitFromSample = value;
            }
          } else {
            acc.dimensions.push(fieldName);
          }

          return acc;
        },
        { dimensions: [], unitFromSample: undefined }
      );

      return [
        mapKey,
        {
          dimensions,
          unitFromSample,
        },
      ];
    })
  );

  return new Map(entries);
}

export async function sampleMetricMetadata({
  esClient,
  metricFields,
  logger,
  timerange: { from, to },
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  logger: Logger;
  timerange: EpochTimeRange;
}): Promise<MetricMetadataMap> {
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
          bool: {
            filter: [
              {
                exists: {
                  field,
                },
              },
              ...dateRangeQuery(from, to),
            ],
          },
        },
        _source: false,
        fields: dimensions.map((dimension) => dimension.name).concat(semconvFlat.unit.name),
      });
    }
    const response = await esClient.msearch<{ fields: Record<string, any> }>(
      'sample_metrics_documents',
      { body }
    );

    return buildMetricMetadataMap(response, metricFields, logger);
  } catch (error) {
    const metricMetadataMap: MetricMetadataMap = new Map();

    for (const { name } of metricFields) {
      metricMetadataMap.set(name, { dimensions: [] });
    }
    return metricMetadataMap;
  }
}

export async function enrichMetricFields({
  esClient,
  metricFields,
  dataStreamFieldCapsMap,
  logger,
  timerange,
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  dataStreamFieldCapsMap: DataStreamFieldCapsMap;
  logger: Logger;
  timerange: EpochTimeRange;
}) {
  if (metricFields.length === 0) {
    return metricFields;
  }

  const metricMetadataMap = await sampleMetricMetadata({
    esClient,
    metricFields,
    logger,
    timerange,
  });

  const uniqueDimensionSets = new Map<string, Array<Dimension>>();

  return metricFields.map((field) => {
    const { dimensions, unitFromSample } =
      metricMetadataMap.get(generateMapKey(field.index, field.name)) || {};
    const fieldCaps = dataStreamFieldCapsMap.get(field.index);

    if (!dimensions || dimensions.length === 0) {
      return { ...field, dimensions: [], noData: true };
    }

    const cacheKey = [...dimensions].sort().join(',');
    if (!uniqueDimensionSets.has(cacheKey) && fieldCaps) {
      uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, dimensions));
    }

    return {
      ...field,
      dimensions: uniqueDimensionSets.get(cacheKey)!,
      noData: false,
      unit: normalizeUnit({ fieldName: field.name, unit: field.unit ?? unitFromSample }),
    };
  });
}
