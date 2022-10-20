/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// @TODO: update ts
// @ts-nocheck

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import DateMath from '@kbn/datemath';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { ESSearchResponse } from '@kbn/es-types';
import { buildAggregationWithSamplingOption, SamplingOption } from './random_sampler_utils';
import type { FieldStatsResponse } from '../types';
import { getFieldExampleBuckets, canProvideExamplesForField } from './field_examples_calculator';

export type SearchHandler = ({
  aggs,
  fields,
  size,
}: {
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
  fields?: object[];
  size?: number;
}) => Promise<estypes.SearchResponse<unknown>>;

const DEFAULT_TOP_VALUES_SIZE = 10;
const SIMPLE_EXAMPLES_SIZE = 100;

export function buildSearchParams({
  dataViewPattern,
  timeFieldName,
  fromDate,
  toDate,
  dslQuery,
  runtimeMappings,
  aggs,
  fields,
  size,
  trackTotalHits = true,
}: {
  dataViewPattern: string;
  timeFieldName?: string;
  fromDate: string;
  toDate: string;
  dslQuery: object;
  runtimeMappings: estypes.MappingRuntimeFields;
  aggs?: Record<string, estypes.AggregationsAggregationContainer>; // is used for aggregatable fields
  fields?: object[]; // is used for non-aggregatable fields
  size?: number; // is used for non-aggregatable fields
  trackTotalHits?: boolean;
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

  if (fields?.length === 1) {
    filter.push({
      exists: fields[0],
    });
  }

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
      fields,
      runtime_mappings: runtimeMappings,
      _source: fields?.length ? false : undefined,
    },
    track_total_hits: trackTotalHits,
    size: size ?? 0,
  };
}

export async function fetchAndCalculateFieldStats({
  searchHandler,
  dataView,
  field,
  fromDate,
  toDate,
  size,
  samplingOption,
}: {
  searchHandler: SearchHandler;
  dataView: DataView;
  field: DataViewField;
  fromDate: string;
  toDate: string;
  size?: number;
  samplingOption: SamplingOption;
}) {
  if (!field.aggregatable) {
    return canProvideExamplesForField(field)
      ? await getSimpleExamples(searchHandler, field, samplingOption, dataView)
      : {};
  }

  if (!canProvideAggregatedStatsForField(field)) {
    return {};
  }

  if (field.type === 'histogram') {
    return await getNumberHistogram(searchHandler, field, samplingOption, false);
  }

  if (field.type === 'number') {
    return await getNumberHistogram(searchHandler, field, samplingOption);
  }

  if (field.type === 'date') {
    return await getDateHistogram(searchHandler, field, samplingOption, { fromDate, toDate });
  }

  return await getStringSamples(searchHandler, field, samplingOption, size);
}

function canProvideAggregatedStatsForField(field: DataViewField): boolean {
  return !(
    field.type === 'document' ||
    field.type.includes('range') ||
    field.type === 'geo_point' ||
    field.type === 'geo_shape' ||
    field.type === 'murmur3' ||
    field.type === 'attachment'
  );
}

export function canProvideStatsForField(field: DataViewField): boolean {
  return (
    (field.aggregatable && canProvideAggregatedStatsForField(field)) ||
    (!field.aggregatable && canProvideExamplesForField(field))
  );
}

export async function getNumberHistogram(
  aggSearchWithBody: SearchHandler,
  field: DataViewField,
  samplingOption: SamplingOption,
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
  const searchWithoutHits = buildAggregationWithSamplingOption(baseAggs, samplingOption);
  const searchWithHits = buildAggregationWithSamplingOption(
    {
      ...baseAggs,
      top_values: {
        terms: { ...fieldRef, size: DEFAULT_TOP_VALUES_SIZE },
      },
    },
    samplingOption
  );

  const minMaxResult = (await aggSearchWithBody({
    aggs: useTopHits ? searchWithHits : searchWithoutHits,
  })) as
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

  const aggs = {
    histo: {
      histogram: {
        field: field.name,
        interval: histogramInterval,
      },
    },
  };

  const histogramBody = buildAggregationWithSamplingOption(aggs, samplingOption);
  const histogramResult = (await aggSearchWithBody({ aggs: histogramBody })) as ESSearchResponse<
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
  field: DataViewField,
  samplingOption: SamplingOption,

  size = DEFAULT_TOP_VALUES_SIZE
): Promise<FieldStatsResponse<string | number>> {
  const fieldRef = getFieldRef(field);

  const aggs = {
    sample_count: { value_count: { ...fieldRef } },
    top_values: {
      terms: {
        ...fieldRef,
        size,
        // 25 is the default shard size set for size:10 by Elasticsearch.
        // Setting it to 25 for every size below 10 makes sure the shard size doesn't change for sizes 1-10, keeping the top terms stable.
        shard_size: size <= 10 ? 25 : undefined,
      },
    },
  };
  const topValuesBody = buildAggregationWithSamplingOption(aggs, samplingOption);
  const topValuesResult = (await aggSearchWithBody({ aggs: topValuesBody })) as ESSearchResponse<
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
  field: DataViewField,
  samplingOption: SamplingOption,
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
  const results = (await aggSearchWithBody({ aggs: histogramBody })) as ESSearchResponse<
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

export async function getSimpleExamples(
  search: SearchHandler,
  field: DataViewField,
  samplingOption: SamplingOption,
  dataView: DataView
): Promise<FieldStatsResponse<string | number>> {
  try {
    const fieldRef = getFieldRef(field);

    const simpleExamplesBody = {
      size: SIMPLE_EXAMPLES_SIZE,
      fields: [fieldRef],
    };

    const simpleExamplesResult = await search(simpleExamplesBody);

    const fieldExampleBuckets = getFieldExampleBuckets({
      hits: simpleExamplesResult.hits.hits,
      field,
      dataView,
      count: DEFAULT_TOP_VALUES_SIZE,
    });

    return {
      totalDocuments: getHitsTotal(simpleExamplesResult),
      sampledDocuments: fieldExampleBuckets.sampledDocuments,
      sampledValues: fieldExampleBuckets.sampledValues,
      topValues: {
        buckets: fieldExampleBuckets.buckets,
      },
    };
  } catch (error) {
    console.error(error); // eslint-disable-line  no-console
    return {};
  }
}

function getFieldRef(field: DataViewField) {
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
  if (body.hits.total === undefined) return 0;
  return (body.hits.total as estypes.SearchTotalHits).value ?? body.hits.total ?? 0;
};
