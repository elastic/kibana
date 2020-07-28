/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { isNumber, keys, values, find, each, cloneDeep, flatten } from 'lodash';
import { buildExistsFilter, buildPhrasesFilter, buildQueryFromFilters } from '../../../../common';
import { AggGroupNames } from '../agg_groups';
import { IAggConfigs } from '../agg_configs';
import { IBucketAggConfig } from './bucket_agg_type';

/**
 * walks the aggregation DSL and returns DSL starting at aggregation with id of startFromAggId
 * @param aggNestedDsl: aggregation config DSL (top level)
 * @param startFromId: id of an aggregation from where we want to get the nested DSL
 */
const getNestedAggDSL = (aggNestedDsl: Record<string, any>, startFromAggId: string): any => {
  if (aggNestedDsl[startFromAggId]) {
    return aggNestedDsl[startFromAggId];
  }
  const nestedAggs: Array<Record<string, any>> = values(aggNestedDsl);
  let aggs;

  for (let i = 0; i < nestedAggs.length; i++) {
    if (nestedAggs[i].aggs && (aggs = getNestedAggDSL(nestedAggs[i].aggs, startFromAggId))) {
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
  response: any,
  aggWithOtherBucket: IBucketAggConfig,
  key: string
) => {
  const keyParts = key.split('-');
  let responseAgg = response;
  for (const i in keyParts) {
    if (keyParts[i]) {
      const responseAggs: Array<Record<string, any>> = values(responseAgg);
      // If you have multi aggs, we cannot just assume the first one is the `other` bucket,
      // so we need to loop over each agg until we find it.
      for (let aggId = 0; aggId < responseAggs.length; aggId++) {
        const aggById = responseAggs[aggId];
        const aggKey = keys(responseAgg)[aggId];
        const aggConfig = find(aggConfigs.aggs, (agg) => agg.id === aggKey);
        if (aggConfig) {
          const aggResultBucket = find(aggById.buckets, (bucket, bucketObjKey) => {
            const bucketKey = aggConfig
              .getKey(bucket, isNumber(bucketObjKey) ? undefined : bucketObjKey)
              .toString();
            return bucketKey === keyParts[i];
          });
          if (aggResultBucket) {
            responseAgg = aggResultBucket;
            break;
          }
        }
      }
    }
  }
  if (responseAgg[aggWithOtherBucket.id]) {
    return responseAgg[aggWithOtherBucket.id].buckets;
  }
  return [];
};

/**
 * gets all the missing buckets in our response for a specific aggregation id
 * @param responseAggs: array of aggregations from response
 * @param aggId: id of the aggregation with missing bucket
 */
const getAggConfigResultMissingBuckets = (responseAggs: any, aggId: string) => {
  const missingKey = '__missing__';
  let resultBuckets: Array<Record<string, any>> = [];
  if (responseAggs[aggId]) {
    const matchingBucket = responseAggs[aggId].buckets.find(
      (bucket: Record<string, any>) => bucket.key === missingKey
    );
    if (matchingBucket) resultBuckets.push(matchingBucket);
    return resultBuckets;
  }
  each(responseAggs, (agg) => {
    if (agg.buckets) {
      each(agg.buckets, (bucket) => {
        resultBuckets = [...resultBuckets, ...getAggConfigResultMissingBuckets(bucket, aggId)];
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
  requestAgg: Record<string, any>,
  key: string,
  otherAgg: IBucketAggConfig
) => {
  return requestAgg['other-filter'].filters.filters[key].bool.must_not
    .filter(
      (filter: Record<string, any>) =>
        filter.match_phrase && filter.match_phrase[otherAgg.params.field.name]
    )
    .map((filter: Record<string, any>) => filter.match_phrase[otherAgg.params.field.name]);
};

export const buildOtherBucketAgg = (
  aggConfigs: IAggConfigs,
  aggWithOtherBucket: IBucketAggConfig,
  response: any
) => {
  const bucketAggs = aggConfigs.aggs.filter((agg) => agg.type.type === AggGroupNames.Buckets);
  const index = bucketAggs.findIndex((agg) => agg.id === aggWithOtherBucket.id);
  const aggs = aggConfigs.toDsl();
  const indexPattern = aggWithOtherBucket.params.field.indexPattern;

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
  const resultAgg = {
    aggs: getNestedAggDSL(aggs, aggWithOtherBucket.id).aggs,
    filters: filterAgg.toDsl(),
  };

  let noAggBucketResults = false;

  // recursively create filters for all parent aggregation buckets
  const walkBucketTree = (
    aggIndex: number,
    aggregations: any,
    aggId: string,
    filters: any[],
    key: string
  ) => {
    // make sure there are actually results for the buckets
    if (aggregations[aggId].buckets.length < 1) {
      noAggBucketResults = true;
      return;
    }

    const agg = aggregations[aggId];
    const newAggIndex = aggIndex + 1;
    const newAgg = bucketAggs[newAggIndex];
    const currentAgg = bucketAggs[aggIndex];
    if (aggIndex < index) {
      each(agg.buckets, (bucket: any, bucketObjKey) => {
        const bucketKey = currentAgg.getKey(
          bucket,
          isNumber(bucketObjKey) ? undefined : bucketObjKey
        );
        const filter = cloneDeep(bucket.filters) || currentAgg.createFilter(bucketKey);
        const newFilters = flatten([...filters, filter]);
        walkBucketTree(
          newAggIndex,
          bucket,
          newAgg.id,
          newFilters,
          `${key}-${bucketKey.toString()}`
        );
      });
      return;
    }

    const hasScriptedField = !!aggWithOtherBucket.params.field.scripted;
    const hasMissingBucket = !!aggWithOtherBucket.params.missingBucket;
    const hasMissingBucketKey = agg.buckets.some(
      (bucket: { key: string }) => bucket.key === '__missing__'
    );
    if (!hasScriptedField && (!hasMissingBucket || hasMissingBucketKey)) {
      filters.push(
        buildExistsFilter(
          aggWithOtherBucket.params.field,
          aggWithOtherBucket.params.field.indexPattern
        )
      );
    }

    // create not filters for all the buckets
    each(agg.buckets, (bucket) => {
      if (bucket.key === '__missing__') return;
      const filter = currentAgg.createFilter(bucket.key);
      filter.meta.negate = true;
      filters.push(filter);
    });

    resultAgg.filters.filters[key] = {
      bool: buildQueryFromFilters(filters, indexPattern),
    };
  };
  walkBucketTree(0, response.aggregations, bucketAggs[0].id, [], '');

  // bail if there were no bucket results
  if (noAggBucketResults) {
    return false;
  }

  return () => {
    return {
      'other-filter': resultAgg,
    };
  };
};

export const mergeOtherBucketAggResponse = (
  aggsConfig: IAggConfigs,
  response: any,
  otherResponse: any,
  otherAgg: IBucketAggConfig,
  requestAgg: Record<string, any>
) => {
  const updatedResponse = cloneDeep(response);
  each(otherResponse.aggregations['other-filter'].buckets, (bucket, key) => {
    if (!bucket.doc_count || key === undefined) return;
    const bucketKey = key.replace(/^-/, '');
    const aggResultBuckets = getAggResultBuckets(
      aggsConfig,
      updatedResponse.aggregations,
      otherAgg,
      bucketKey
    );
    const requestFilterTerms = getOtherAggTerms(requestAgg, key, otherAgg);

    const phraseFilter = buildPhrasesFilter(
      otherAgg.params.field,
      requestFilterTerms,
      otherAgg.params.field.indexPattern
    );
    phraseFilter.meta.negate = true;
    bucket.filters = [phraseFilter];
    bucket.key = '__other__';

    if (
      aggResultBuckets.some(
        (aggResultBucket: Record<string, any>) => aggResultBucket.key === '__missing__'
      )
    ) {
      bucket.filters.push(
        buildExistsFilter(otherAgg.params.field, otherAgg.params.field.indexPattern)
      );
    }
    aggResultBuckets.push(bucket);
  });
  return updatedResponse;
};

export const updateMissingBucket = (
  response: any,
  aggConfigs: IAggConfigs,
  agg: IBucketAggConfig
) => {
  const updatedResponse = cloneDeep(response);
  const aggResultBuckets = getAggConfigResultMissingBuckets(updatedResponse.aggregations, agg.id);
  aggResultBuckets.forEach((bucket) => {
    bucket.key = '__missing__';
  });
  return updatedResponse;
};
