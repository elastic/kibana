/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import DateMath from '@kbn/datemath';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { FieldStatsResponse } from '../types';

export type SearchHandler = (
  aggs: Record<string, estypes.AggregationsAggregationContainer>
) => Promise<estypes.SearchResponse<unknown>>;

const SHARD_SIZE = 5000;
const DEFAULT_TOP_VALUES_SIZE = 10;

export function buildSearchParams({
  dataViewPattern,
  timeFieldName,
  fromDate,
  toDate,
  dslQuery,
  runtimeMappings,
  aggs,
}: {
  dataViewPattern: string;
  timeFieldName?: string;
  fromDate: string;
  toDate: string;
  dslQuery: object;
  runtimeMappings: estypes.MappingRuntimeFields;
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
}) {
  const filter = timeFieldName
    ? [
        {
          range: {
            [timeFieldName]: {
              gte: fromDate,
              lte: toDate,
            },
          },
        },
        dslQuery,
      ]
    : [dslQuery];

  const query = {
    bool: {
      filter,
    },
  };

  return {
    index: dataViewPattern,
    body: {
      query,
      aggs,
      runtime_mappings: runtimeMappings,
    },
    track_total_hits: true,
    size: 0,
  };
}

export async function fetchAndCalculateFieldStats({
  searchHandler,
  field,
  fromDate,
  toDate,
  size,
}: {
  searchHandler: SearchHandler;
  field: DataViewFieldBase;
  fromDate: string;
  toDate: string;
  size?: number;
}) {
  if (!canProvideStatsForField(field)) {
    return {};
  }

  if (field.type === 'histogram') {
    return await getNumberHistogram(searchHandler, field, false);
  }

  if (field.type === 'number') {
    return await getNumberHistogram(searchHandler, field);
  }

  if (field.type === 'date') {
    return await getDateHistogram(searchHandler, field, { fromDate, toDate });
  }

  return await getStringSamples(searchHandler, field, size);
}

export function canProvideStatsForField(field: DataViewFieldBase): boolean {
  return !(
    field.type === 'document' ||
    field.type.includes('range') ||
    field.type === 'geo_point' ||
    field.type === 'geo_shape'
  );
}

export async function getNumberHistogram(
  aggSearchWithBody: SearchHandler,
  field: DataViewFieldBase,
  useTopHits = true
): Promise<FieldStatsResponse<string | number>> {
  const fieldRef = getFieldRef(field);

  const baseAggs = {
    min_value: {
      min: { field: field.name },
    },
    max_value: {
      max: { field: field.name },
    },
    sample_count: { value_count: { ...fieldRef } },
  };
  const searchWithoutHits = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: { ...baseAggs },
    },
  };
  const searchWithHits = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        ...baseAggs,
        top_values: {
          terms: { ...fieldRef, size: DEFAULT_TOP_VALUES_SIZE },
        },
      },
    },
  };

  const minMaxResult = (await aggSearchWithBody(
    useTopHits ? searchWithHits : searchWithoutHits
  )) as
    | ESSearchResponse<unknown, { body: { aggs: typeof searchWithHits } }>
    | ESSearchResponse<unknown, { body: { aggs: typeof searchWithoutHits } }>;

  const minValue = minMaxResult.aggregations!.sample.min_value.value;
  const maxValue = minMaxResult.aggregations!.sample.max_value.value;
  const terms =
    'top_values' in minMaxResult.aggregations!.sample
      ? minMaxResult.aggregations!.sample.top_values
      : {
          buckets: [] as Array<{ doc_count: number; key: string | number }>,
        };

  const topValuesBuckets = {
    buckets: terms.buckets.map((bucket) => ({
      count: bucket.doc_count,
      key: bucket.key,
    })),
  };

  let histogramInterval = (maxValue! - minValue!) / 10;

  if (Number.isInteger(minValue!) && Number.isInteger(maxValue!)) {
    histogramInterval = Math.ceil(histogramInterval);
  }

  if (histogramInterval === 0) {
    return {
      totalDocuments: getHitsTotal(minMaxResult),
      sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
      sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
      topValues: topValuesBuckets,
      histogram: useTopHits
        ? { buckets: [] }
        : {
            // Insert a fake bucket for a single-value histogram
            buckets: [{ count: minMaxResult.aggregations!.sample.doc_count, key: minValue! }],
          },
    };
  }

  const histogramBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        histo: {
          histogram: {
            field: field.name,
            interval: histogramInterval,
          },
        },
      },
    },
  };
  const histogramResult = (await aggSearchWithBody(histogramBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    totalDocuments: getHitsTotal(minMaxResult),
    sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
    sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
    histogram: {
      buckets: histogramResult.aggregations!.sample.histo.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
    topValues: topValuesBuckets,
  };
}

export async function getStringSamples(
  aggSearchWithBody: SearchHandler,
  field: DataViewFieldBase,
  size = DEFAULT_TOP_VALUES_SIZE
): Promise<FieldStatsResponse<string | number>> {
  const fieldRef = getFieldRef(field);

  const topValuesBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        sample_count: { value_count: { ...fieldRef } },
        top_values: {
          terms: {
            ...fieldRef,
            size,
          },
        },
      },
    },
  };
  const topValuesResult = (await aggSearchWithBody(topValuesBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof topValuesBody } }
  >;

  return {
    totalDocuments: getHitsTotal(topValuesResult),
    sampledDocuments: topValuesResult.aggregations!.sample.doc_count,
    sampledValues: topValuesResult.aggregations!.sample.sample_count.value!,
    topValues: {
      buckets: topValuesResult.aggregations!.sample.top_values.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}

// This one is not sampled so that it returns the full date range
export async function getDateHistogram(
  aggSearchWithBody: SearchHandler,
  field: DataViewFieldBase,
  range: { fromDate: string; toDate: string }
): Promise<FieldStatsResponse<string | number>> {
  const fromDate = DateMath.parse(range.fromDate);
  const toDate = DateMath.parse(range.toDate);
  if (!fromDate) {
    throw Error('Invalid fromDate value');
  }
  if (!toDate) {
    throw Error('Invalid toDate value');
  }

  const interval = Math.round((toDate.valueOf() - fromDate.valueOf()) / 10);
  if (interval < 1) {
    return {
      totalDocuments: 0,
      histogram: { buckets: [] },
    };
  }

  // TODO: Respect rollup intervals
  const fixedInterval = `${interval}ms`;

  const histogramBody = {
    histo: { date_histogram: { ...getFieldRef(field), fixed_interval: fixedInterval } },
  };
  const results = (await aggSearchWithBody(histogramBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    totalDocuments: getHitsTotal(results),
    histogram: {
      buckets: results.aggregations!.histo.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}

function getFieldRef(field: DataViewFieldBase) {
  return field.scripted
    ? {
        script: {
          lang: field.lang!,
          source: field.script as string,
        },
      }
    : { field: field.name };
}

const getHitsTotal = (body: estypes.SearchResponse): number => {
  return (body.hits.total as estypes.SearchTotalHits).value ?? body.hits.total ?? 0;
};
