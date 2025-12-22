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
import { dateRangeQuery, termsQuery } from '@kbn/es-query';
import type { IndexFieldCapsMap, EpochTimeRange } from '../../types';
import type { Dimension, MetricField, DimensionFilters } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import { normalizeUnit } from './normalize_unit';
import { NUMERIC_TYPES } from '../../../common/fields/constants';

export interface MetricMetadata {
  dimensions: string[];
  unitFromSample?: string;
  totalHits: number;
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
        return [mapKey, { dimensions: [], totalHits: 0 }];
      }

      if (!searchResult?.hits.hits?.length) {
        return [mapKey, { dimensions: [], totalHits: 0 }];
      }

      const fields = searchResult.hits.hits[0].fields ?? {};
      const { dimensions, unitFromSample } = Object.entries(fields).reduce<
        Omit<MetricMetadata, 'totalHits'>
      >(
        (acc, [fieldName, fieldValue]) => {
          if (fieldName === semconvFlat.unit.name) {
            const value = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;

            if (typeof value === 'string') {
              acc.unitFromSample = value;
            }
            return acc;
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
          totalHits: searchResult?.hits.hits?.length ?? 0,
        },
      ];
    })
  );

  return new Map(entries);
}

const buildFilters = (filterEntries: Array<[string, string[]]>, dimensions: Dimension[]) => {
  const dimensionMap = new Map(dimensions.map((dimension) => [dimension.name, dimension]));

  return filterEntries.flatMap(([dimensionName, values]) => {
    const dimension = dimensionMap.get(dimensionName);

    if (!dimension) {
      return termsQuery(dimensionName, values);
    }

    return termsQuery(
      dimensionName,
      NUMERIC_TYPES.includes(dimension.type) ? values.map(Number).filter(Boolean) : values
    );
  });
};

export async function sampleMetricMetadata({
  esClient,
  metricFields,
  logger,
  timerange: { from, to },
  filters,
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  logger: Logger;
  timerange: EpochTimeRange;
  filters: DimensionFilters;
}): Promise<MetricMetadataMap> {
  if (metricFields.length === 0) {
    return new Map();
  }

  const filterEntries = Object.entries(filters);

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
              ...(filterEntries.length > 0
                ? [
                    {
                      bool: {
                        should: buildFilters(filterEntries, dimensions),
                        minimum_should_match: 1,
                      },
                    },
                  ]
                : []),
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
      metricMetadataMap.set(name, { dimensions: [], totalHits: 0 });
    }
    return metricMetadataMap;
  }
}

export async function enrichMetricFields({
  esClient,
  metricFields,
  indexFieldCapsMap,
  logger,
  timerange,
  filters = {},
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  indexFieldCapsMap: IndexFieldCapsMap;
  logger: Logger;
  timerange: EpochTimeRange;
  filters?: DimensionFilters;
}): Promise<MetricField[]> {
  if (metricFields.length === 0) {
    return metricFields;
  }

  const metricMetadataMap = await sampleMetricMetadata({
    esClient,
    metricFields,
    logger,
    timerange,
    filters,
  });

  const uniqueDimensionSets = new Map<string, Array<Dimension>>();

  return metricFields.map((field) => {
    const { dimensions, unitFromSample, totalHits } =
      metricMetadataMap.get(generateMapKey(field.index, field.name)) || {};
    const fieldCaps = indexFieldCapsMap.get(field.index);

    if ((!dimensions || dimensions.length === 0) && totalHits === 0) {
      return { ...field, dimensions: [], noData: true };
    }

    const cacheKey = dimensions ? [...(dimensions || [])].sort().join(',') : undefined;
    if (cacheKey && !uniqueDimensionSets.has(cacheKey) && fieldCaps) {
      uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, dimensions));
    }

    return {
      ...field,
      dimensions: cacheKey ? uniqueDimensionSets.get(cacheKey) ?? [] : [],
      noData: false,
      unit: normalizeUnit({ fieldName: field.name, unit: field.unit ?? unitFromSample }),
    };
  });
}
