/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNumber, keys, values, find, each, flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';
import { buildExistsFilter, buildPhrasesFilter, buildQueryFromFilters } from '@kbn/es-query';
import { lastValueFrom } from 'rxjs';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import { AggGroupNames } from '../agg_groups';
import type { IAggConfigs } from '../agg_configs';
import type { IAggType } from '../agg_type';
import type { IAggConfig } from '../agg_config';
import { createSamplerAgg } from '../utils/sampler';

export const OTHER_NESTED_BUCKET_SEPARATOR = '╰┄►';
const otherBucketRegexp = new RegExp(`^${OTHER_NESTED_BUCKET_SEPARATOR}`);

/**
 * walks the aggregation DSL and returns DSL starting at aggregation with id of startFromAggId
 * @param aggNestedDsl: aggregation config DSL (top level)
 * @param startFromId: id of an aggregation from where we want to get the nested DSL
 */
const getNestedAggDSL = (
  aggNestedDsl: Record<string, unknown>,
  startFromAggId: string
): Record<string, unknown> | undefined => {
  if (aggNestedDsl[startFromAggId]) {
    return aggNestedDsl[startFromAggId] as Record<string, unknown>;
  }
  const nestedAggs = values(aggNestedDsl) as Array<Record<string, unknown>>;
  let aggs;

  for (let i = 0; i < nestedAggs.length; i++) {
    if (
      nestedAggs[i].aggs &&
      (aggs = getNestedAggDSL(nestedAggs[i].aggs as Record<string, unknown>, startFromAggId))
    ) {
      return aggs;
    }
  }
};

/**
 * returns buckets from response for a specific other bucket
 * @param aggConfigs: configuration for the aggregations
 * @param response: response from elasticsearch
 * @param aggWithOtherBucket: AggConfig of the aggregation with other bucket enabled
 * @param key: key from the other bucket request for a specific other bucket
 */
const getAggResultBuckets = (
  aggConfigs: IAggConfigs,
  response: estypes.SearchResponse<unknown>['aggregations'],
  aggWithOtherBucket: IAggConfig,
  key: string
) => {
  const keyParts = key.split(OTHER_NESTED_BUCKET_SEPARATOR);
  let responseAgg = response as Record<string, unknown> | undefined;
  for (const i in keyParts) {
    // enable also the empty string
    if (keyParts[i] != null) {
      const responseAggs = values(responseAgg) as Array<Record<string, unknown>>;
      // If you have multi aggs, we cannot just assume the first one is the `other` bucket,
      // so we need to loop over each agg until we find it.
      for (let aggId = 0; aggId < responseAggs.length; aggId++) {
        const aggById = responseAggs[aggId];
        const aggKey = keys(responseAgg)[aggId];
        const aggConfig = find(aggConfigs.aggs, (agg) => agg.id === aggKey);
        if (aggConfig) {
          const aggResultBucket = find(
            aggById.buckets as Record<string, unknown>,
            (bucket: unknown, bucketObjKey: string | number | undefined) => {
              const bucketKey = String(
                aggConfig.getKey(
                  bucket,
                  isNumber(bucketObjKey) ? undefined : (bucketObjKey as string)
                )
              );
              return bucketKey === keyParts[i];
            }
          );
          if (aggResultBucket) {
            // this is a special check in order to avoid an overwrite when
            // there's an empty string term at root level for the data request
            // as the other request will default to empty string category as well
            if (!responseAgg?.[aggWithOtherBucket.id] || keyParts[i] !== '') {
              responseAgg = aggResultBucket as Record<string, unknown>;
              break;
            }
          }
        }
      }
    }
  }
  if (responseAgg?.[aggWithOtherBucket.id]) {
    return (responseAgg[aggWithOtherBucket.id] as Record<string, unknown>).buckets;
  }
  return [];
};

/**
 * gets all the missing buckets in our response for a specific aggregation id
 * @param responseAggs: array of aggregations from response
 * @param aggId: id of the aggregation with missing bucket
 */
const getAggConfigResultMissingBuckets = (responseAggs: Record<string, unknown>, aggId: string) => {
  const resultBuckets: Array<Record<string, unknown>> = [];
  if (responseAggs[aggId]) {
    const aggResult = responseAggs[aggId] as Record<string, unknown>;
    const matchingBucket = (aggResult.buckets as Array<Record<string, unknown>>).find(
      (bucket: Record<string, unknown>) => bucket.key === MISSING_TOKEN
    );
    if (matchingBucket) {
      resultBuckets.push(matchingBucket);
    }
    return resultBuckets;
  }
  each(responseAggs, (agg: unknown) => {
    const aggObj = agg as Record<string, unknown>;
    if (aggObj.buckets) {
      each(aggObj.buckets as Record<string, unknown>, (bucket: unknown) => {
        resultBuckets.push(
          ...getAggConfigResultMissingBuckets(bucket as Record<string, unknown>, aggId)
        );
      });
    }
  });

  return resultBuckets;
};

/**
 * gets all the terms that are NOT in the other bucket
 * @param requestAgg: an aggregation we are looking at
 * @param key: the key for this specific other bucket
 * @param otherAgg: AggConfig of the aggregation with other bucket
 */
const getOtherAggTerms = (
  requestAgg: Record<string, unknown>,
  key: string,
  otherAgg: IAggConfig
) => {
  const otherFilter = requestAgg['other-filter'] as Record<string, unknown>;
  const filters = otherFilter.filters as Record<string, unknown>;
  const filtersObj = filters.filters as Record<string, unknown>;
  const keyFilter = filtersObj[key] as Record<string, unknown>;
  const boolObj = keyFilter.bool as Record<string, unknown>;
  const mustNot = boolObj.must_not as Array<Record<string, unknown>>;
  const fieldName = (otherAgg.params.field as { name: string }).name;
  return mustNot
    .filter(
      (filter: Record<string, unknown>) =>
        filter.match_phrase && (filter.match_phrase as Record<string, unknown>)[fieldName] != null // mind empty strings!
    )
    .map(
      (filter: Record<string, unknown>) =>
        (filter.match_phrase as Record<string, unknown>)[fieldName]
    );
};

/**
 * Helper function to handle sampling case and get the correct cursor agg from a request object
 */
const getCorrectAggCursorFromRequest = (
  requestAgg: Record<string, unknown>,
  aggConfigs: IAggConfigs
) => {
  return aggConfigs.isSamplingEnabled()
    ? ((requestAgg.sampling as Record<string, unknown>).aggs as Record<string, unknown>)
    : requestAgg;
};

/**
 * Helper function to handle sampling case and get the correct cursor agg from a response object
 */
const getCorrectAggregationsCursorFromResponse = (
  response: estypes.SearchResponse<unknown>,
  aggConfigs: IAggConfigs
) => {
  return aggConfigs.isSamplingEnabled()
    ? (response.aggregations?.sampling as Record<string, estypes.AggregationsAggregate>)
    : response.aggregations;
};

export const buildOtherBucketAgg = (
  aggConfigs: IAggConfigs,
  aggWithOtherBucket: IAggConfig,
  response: estypes.SearchResponse<unknown>
) => {
  const bucketAggs = aggConfigs.aggs.filter(
    (agg) => agg.type.type === AggGroupNames.Buckets && agg.enabled
  );
  const index = bucketAggs.findIndex((agg) => agg.id === aggWithOtherBucket.id);
  const aggs = aggConfigs.toDsl();
  const indexPattern = aggWithOtherBucket.aggConfigs.indexPattern;

  // create filters aggregation
  const filterAgg = aggConfigs.createAggConfig(
    {
      type: 'filters',
      id: 'other',
      params: {
        filters: [],
      },
      enabled: false,
    },
    {
      addToAggConfigs: false,
    }
  );

  // nest all the child aggregations of aggWithOtherBucket
  const nestedDsl = getNestedAggDSL(aggs, aggWithOtherBucket.id);
  const resultAgg: Record<string, unknown> = {
    aggs: nestedDsl?.aggs,
    filters: filterAgg.toDsl(),
  };

  let noAggBucketResults = false;
  let exhaustiveBuckets = true;

  // recursively create filters for all parent aggregation buckets
  const walkBucketTree = (
    aggIndex: number,
    aggregations: Record<string, unknown>,
    aggId: string,
    filters: unknown[],
    key: string
  ) => {
    // make sure there are actually results for the buckets
    const aggRaw = aggregations[aggId] as Record<string, unknown> | undefined;
    if (
      !aggRaw ||
      // buckets can be either an array or an object in case there's also a filter at the same level
      (Array.isArray(aggRaw.buckets)
        ? !(aggRaw.buckets as unknown[]).length
        : !Object.values(aggRaw.buckets as Record<string, unknown>).length)
    ) {
      noAggBucketResults = true;
      return;
    }
    const newAggIndex = aggIndex + 1;
    const newAgg = bucketAggs[newAggIndex];
    const currentAgg = bucketAggs[aggIndex];
    if (aggIndex === index && aggRaw && (aggRaw.sum_other_doc_count as number) > 0) {
      exhaustiveBuckets = false;
    }
    if (aggIndex < index) {
      each(
        aggRaw?.buckets as Record<string, unknown>,
        (bucket: unknown, bucketObjKey: string | number | undefined) => {
          const bucketKey = currentAgg.getKey(
            bucket,
            isNumber(bucketObjKey) ? undefined : bucketObjKey
          );
          const bucketObj = bucket as Record<string, unknown>;
          const filter =
            structuredClone(bucketObj.filters) || currentAgg.createFilter(bucketKey as string);
          const newFilters = flatten([...filters, filter]);
          walkBucketTree(
            newAggIndex,
            bucketObj as Record<string, unknown>,
            newAgg.id,
            newFilters,
            `${key}${OTHER_NESTED_BUCKET_SEPARATOR}${String(bucketKey)}`
          );
        }
      );
      return;
    }

    const field = aggWithOtherBucket.getField();
    const hasScriptedField = !!field?.scripted;
    const hasMissingBucket = !!aggWithOtherBucket.getParam('missingBucket');
    const hasMissingBucketKey = (aggRaw.buckets as Array<Record<string, unknown>>).some(
      (bucket: Record<string, unknown>) => bucket.key === MISSING_TOKEN
    );
    if (field && !hasScriptedField && (!hasMissingBucket || hasMissingBucketKey)) {
      filters.push(buildExistsFilter(field, aggWithOtherBucket.aggConfigs.indexPattern));
    }

    // create not filters for all the buckets
    each(aggRaw.buckets as Array<Record<string, unknown>>, (bucket: unknown) => {
      const b = bucket as Record<string, unknown>;
      if (b.key === MISSING_TOKEN) return;
      const filter = currentAgg.createFilter(
        currentAgg.getKey(bucket, b.key as string) as string
      ) as Filter;
      filter.meta.negate = true;
      filters.push(filter);
    });

    (resultAgg.filters as Record<string, unknown>).filters =
      (resultAgg.filters as Record<string, unknown>).filters || {};
    ((resultAgg.filters as Record<string, unknown>).filters as Record<string, unknown>)[key] = {
      bool: buildQueryFromFilters(filters as Filter[], indexPattern),
    };
  };
  walkBucketTree(
    0,
    getCorrectAggregationsCursorFromResponse(response, aggConfigs) as Record<string, unknown>,
    bucketAggs[0].id,
    [],
    ''
  );

  // bail if there were no bucket results
  if (noAggBucketResults || exhaustiveBuckets) {
    return false;
  }

  return () => {
    if (aggConfigs.isSamplingEnabled()) {
      return {
        sampling: {
          ...createSamplerAgg(aggConfigs.samplerConfig),
          aggs: { 'other-filter': resultAgg },
        },
      };
    }
    return {
      'other-filter': resultAgg,
    };
  };
};

export const mergeOtherBucketAggResponse = (
  aggsConfig: IAggConfigs,
  response: estypes.SearchResponse<unknown>,
  otherResponse: estypes.SearchResponse<unknown>,
  otherAgg: IAggConfig,
  requestAgg: Record<string, unknown>,
  otherFilterBuilder: (
    requestAgg: Record<string, unknown>,
    key: string,
    otherAgg: IAggConfig
  ) => Filter
): estypes.SearchResponse<unknown> => {
  const updatedResponse = structuredClone(response);
  const updatedOtherResponse = structuredClone(otherResponse);
  const aggregationsRoot = getCorrectAggregationsCursorFromResponse(
    updatedOtherResponse,
    aggsConfig
  );
  const updatedAggregationsRoot = getCorrectAggregationsCursorFromResponse(
    updatedResponse,
    aggsConfig
  );
  const otherFilter = aggregationsRoot?.['other-filter'] as Record<string, unknown> | undefined;
  const buckets =
    otherFilter && 'buckets' in otherFilter
      ? (otherFilter.buckets as Record<string, Record<string, unknown>>)
      : {};
  each(buckets, (bucket: Record<string, unknown>, key: string | undefined) => {
    if (!bucket.doc_count || key === undefined) return;
    const bucketKey = key.replace(otherBucketRegexp, '');
    const aggResultBuckets = getAggResultBuckets(
      aggsConfig,
      updatedAggregationsRoot,
      otherAgg,
      bucketKey
    ) as Array<Record<string, unknown>>;
    const otherFilterResult = otherFilterBuilder(
      getCorrectAggCursorFromRequest(requestAgg, aggsConfig),
      key,
      otherAgg
    );
    bucket.filters = [otherFilterResult];
    bucket.key = '__other__';

    if (
      aggResultBuckets.some(
        (aggResultBucket: Record<string, unknown>) => aggResultBucket.key === MISSING_TOKEN
      )
    ) {
      const field = otherAgg.getField();
      if (field) {
        (bucket.filters as Filter[]).push(
          buildExistsFilter(field, otherAgg.aggConfigs.indexPattern)
        );
      }
    }
    aggResultBuckets.push(bucket);
  });
  return updatedResponse;
};
export const updateMissingBucket = (
  response: estypes.SearchResponse<unknown>,
  aggConfigs: IAggConfigs,
  agg: IAggConfig
) => {
  const updatedResponse = structuredClone(response);
  const aggResultBuckets = getAggConfigResultMissingBuckets(
    getCorrectAggregationsCursorFromResponse(updatedResponse, aggConfigs) as Record<
      string,
      unknown
    >,
    agg.id
  );
  aggResultBuckets.forEach((bucket) => {
    bucket.key = MISSING_TOKEN;
  });
  return updatedResponse;
};

export function constructSingleTermOtherFilter(
  requestAgg: Record<string, unknown>,
  key: string,
  otherAgg: IAggConfig
) {
  const requestFilterTerms = getOtherAggTerms(requestAgg, key, otherAgg);

  const phraseFilter = buildPhrasesFilter(
    otherAgg.getField()!,
    requestFilterTerms as string[],
    otherAgg.aggConfigs.indexPattern
  );
  phraseFilter.meta.negate = true;
  return phraseFilter;
}

export function constructMultiTermOtherFilter(
  requestAgg: Record<string, unknown>,
  key: string
): Filter {
  return {
    query: (
      ((requestAgg['other-filter'] as Record<string, unknown>).filters as Record<string, unknown>)
        .filters as Record<string, unknown>
    )[key] as Record<string, unknown>,
    meta: {},
  };
}

export const createOtherBucketPostFlightRequest = (
  otherFilterBuilder: (
    requestAgg: Record<string, unknown>,
    key: string,
    otherAgg: IAggConfig
  ) => Filter
) => {
  const postFlightRequest: IAggType['postFlightRequest'] = async (
    resp,
    aggConfigs,
    aggConfig,
    searchSource,
    inspectorRequestAdapter,
    abortSignal,
    searchSessionId,
    disableWarningToasts
  ) => {
    if (!resp.aggregations) return resp;
    const nestedSearchSource = searchSource.createChild();
    if (aggConfig.params.otherBucket) {
      const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
      if (!filterAgg) return resp;

      nestedSearchSource.setField('aggs', filterAgg);

      const { rawResponse: otherResponse } = await lastValueFrom(
        nestedSearchSource.fetch$({
          abortSignal,
          sessionId: searchSessionId,
          disableWarningToasts,
          inspector: {
            adapter: inspectorRequestAdapter,
            title: i18n.translate('data.search.aggs.buckets.terms.otherBucketTitle', {
              defaultMessage: 'Other bucket',
            }),
            description: i18n.translate('data.search.aggs.buckets.terms.otherBucketDescription', {
              defaultMessage:
                'This request counts the number of documents that fall ' +
                'outside the criterion of the data buckets.',
            }),
          },
        })
      );

      resp = mergeOtherBucketAggResponse(
        aggConfigs,
        resp,
        otherResponse,
        aggConfig,
        filterAgg(),
        otherFilterBuilder
      );
    }
    if (aggConfig.params.missingBucket) {
      resp = updateMissingBucket(resp, aggConfigs, aggConfig);
    }
    return resp;
  };
  return postFlightRequest;
};
