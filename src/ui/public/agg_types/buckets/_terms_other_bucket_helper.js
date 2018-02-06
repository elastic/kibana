import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { buildPhrasesFilter } from 'ui/filter_manager/lib/phrases';
import { buildExistsFilter } from 'ui/filter_manager/lib/exists';
import { buildQueryFromFilters } from 'ui/courier/data_source/build_query/from_filters';

/**
 * walks the aggregation DSL and returns DSL starting at aggregation with id of startFromAggId
 * @param aggNestedDsl: aggregation config DSL (top level)
 * @param startFromId: id of an aggregation from where we want to get the nested DSL
 */
const getNestedAggDSL = (aggNestedDsl, startFromAggId) => {
  if (aggNestedDsl[startFromAggId]) return aggNestedDsl[startFromAggId];
  return getNestedAggDSL(_.values(aggNestedDsl)[0].aggs, startFromAggId);
};

/**
 * returns buckets from response for a specific other bucket
 * @param aggConfigs: configuration for the aggregations
 * @param response: response from elasticsearch
 * @param aggWithOtherBucket: AggConfig of the aggregation with other bucket enabled
 * @param key: key from the other bucket request for a specific other bucket
 */
const getAggResultBuckets = (aggConfigs, response, aggWithOtherBucket, key) => {
  const keyParts = key.split('-');
  let responseAgg = response;
  for (const i in keyParts) {
    if (keyParts[i]) {
      const agg = _.values(responseAgg)[0];
      const aggKey = _.keys(responseAgg)[0];
      const aggConfig = _.find(aggConfigs, agg => agg.id === aggKey);
      const bucket = _.find(agg.buckets, (bucket, bucketObjKey) => {
        const bucketKey = aggConfig.getKey(bucket, Number.isInteger(bucketObjKey) ? null : bucketObjKey).toString();
        return bucketKey === keyParts[i];
      });
      if (bucket) {
        responseAgg = bucket;
      }
    }
  }
  if (responseAgg[aggWithOtherBucket.id]) return responseAgg[aggWithOtherBucket.id].buckets;
  return [];
};

/**
 * gets all the missing buckets in our response for a specific aggregation id
 * @param responseAggs: array of aggregations from response
 * @param aggId: id of the aggregation with missing bucket
 */
const getAggConfigResultMissingBuckets = (responseAggs, aggId) => {
  const missingKey = '__missing__';
  let resultBuckets = [];
  if (responseAggs[aggId]) {
    const matchingBucket = responseAggs[aggId].buckets.find(bucket => bucket.key === missingKey);
    if (matchingBucket) resultBuckets.push(matchingBucket);
    return resultBuckets;
  }
  _.each(responseAggs, agg => {
    if (agg.buckets) {
      _.each(agg.buckets, bucket => {
        resultBuckets = [
          ...resultBuckets,
          ...getAggConfigResultMissingBuckets(bucket, aggId, missingKey)
        ];
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
const getOtherAggTerms = (requestAgg, key, otherAgg) => {
  return requestAgg['other-filter'].filters.filters[key].bool.must_not.filter(filter =>
    filter.match_phrase && filter.match_phrase[otherAgg.params.field.name]
  ).map(filter =>
    filter.match_phrase[otherAgg.params.field.name].query
  );
};


export const OtherBucketHelperProvider = (Private) => {
  const AggConfig = Private(VisAggConfigProvider);

  const buildOtherBucketAgg = (aggConfigs, aggWithOtherBucket, response) => {
    const bucketAggs = aggConfigs.filter(agg => agg.type.type === 'buckets');
    const index = bucketAggs.findIndex(agg => agg.id === aggWithOtherBucket.id);
    const aggs = aggConfigs.toDsl();
    const indexPattern = aggWithOtherBucket.params.field.indexPattern;

    // create filters aggregation
    const filterAgg = new AggConfig(aggConfigs[index].vis, {
      type: 'filters',
      id: 'other',
      schema: {
        group: 'buckets'
      }
    });

    // nest all the child aggregations of aggWithOtherBucket
    const resultAgg = {
      aggs: getNestedAggDSL(aggs, aggWithOtherBucket.id).aggs,
      filters: filterAgg.toDsl(),
    };

    // create filters for all parent aggregation buckets
    const walkBucketTree = (aggIndex, aggs, aggId, filters, key) => {
      const agg = aggs[aggId];
      const newAggIndex = aggIndex + 1;
      const newAgg = bucketAggs[newAggIndex];
      const currentAgg = bucketAggs[aggIndex];
      if (aggIndex < index) {
        _.each(agg.buckets, (bucket, bucketObjKey) => {
          const bucketKey = currentAgg.getKey(bucket, Number.isInteger(bucketObjKey) ? null : bucketObjKey);
          const filter = _.cloneDeep(bucket.filter) || currentAgg.createFilter(bucketKey);
          const newFilters = [...filters, filter];
          walkBucketTree(newAggIndex, bucket, newAgg.id, newFilters, `${key}-${bucketKey.toString()}`);
        });
        return;
      }

      if (!aggWithOtherBucket.params.missingBucket || agg.buckets.some(bucket => bucket.key === '__missing__')) {
        filters.push(buildExistsFilter(aggWithOtherBucket.params.field, aggWithOtherBucket.params.field.indexPattern));
      }

      // create not filters for all the buckets
      _.each(agg.buckets, bucket => {
        if (bucket.key === '__missing__') return;
        const filter = currentAgg.createFilter(bucket.key);
        filter.meta.negate = true;
        filters.push(filter);
      });

      resultAgg.filters.filters[key] = {
        bool: buildQueryFromFilters(filters, _.noop, indexPattern)
      };
    };
    walkBucketTree(0, response.aggregations, bucketAggs[0].id, [], '');

    return () => {
      return {
        'other-filter': resultAgg
      };
    };
  };

  const mergeOtherBucketAggResponse = (aggsConfig, response, otherResponse, otherAgg, requestAgg) => {
    const updatedResponse = _.cloneDeep(response);
    _.each(otherResponse.aggregations['other-filter'].buckets, (bucket, key) => {
      if (!bucket.doc_count) return;
      const bucketKey = key.replace(/^-/, '');
      const aggResultBuckets = getAggResultBuckets(aggsConfig, updatedResponse.aggregations, otherAgg, bucketKey);
      const requestFilterTerms = getOtherAggTerms(requestAgg, key, otherAgg);

      const phraseFilter = buildPhrasesFilter(otherAgg.params.field, requestFilterTerms, otherAgg.params.field.indexPattern);
      phraseFilter.meta.negate = true;
      bucket.filters = [ phraseFilter ];
      bucket.key = otherAgg.params.otherBucketLabel;

      if (aggResultBuckets.some(bucket => bucket.key === '__missing__')) {
        bucket.filters.push(buildExistsFilter(otherAgg.params.field, otherAgg.params.field.indexPattern));
      }

      aggResultBuckets.push(bucket);
    });
    return updatedResponse;
  };

  const updateMissingBucket = (response, aggConfigs, agg) => {
    const updatedResponse = _.cloneDeep(response);
    const aggResultBuckets = getAggConfigResultMissingBuckets(updatedResponse.aggregations, agg.id);
    aggResultBuckets.forEach(bucket => {
      bucket.key = agg.params.missingBucketLabel;
      const existsFilter = buildExistsFilter(agg.params.field, agg.params.field.indexPattern);
      existsFilter.meta.negate = true;
      bucket.filters = [ existsFilter ];
    });
    return updatedResponse;
  };

  return { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket };
};
