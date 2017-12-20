import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { buildPhrasesFilter } from 'ui/filter_manager/lib/phrases';
import { buildExistsFilter } from 'ui/filter_manager/lib/exists';
import { buildQueryFromFilters } from 'ui/courier/data_source/build_query/from_filters';

const getAggConfig = (aggs, aggWithOtherBucket) => {
  if (aggs[aggWithOtherBucket.id]) return aggs[aggWithOtherBucket.id];
  return getAggConfig(_.values(aggs)[0].aggs, aggWithOtherBucket);
};

const getAggResultBuckets = (aggsConfig, response, aggWithOtherBucket, key) => {
  const keyParts = key.split('-');
  let responseAgg = response;
  for (const i in keyParts) {
    if (keyParts[i]) {
      const agg = _.values(responseAgg)[0];
      const aggKey = _.keys(responseAgg)[0];
      const aggConfig = _.find(aggsConfig, agg => agg.id === aggKey);
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

const getAggConfigResult = (responseAggs, aggId, bucketKey) => {
  let resultBuckets = [];
  if (responseAggs[aggId]) {
    const matchingBucket = responseAggs[aggId].buckets.find(bucket => bucket.key === bucketKey);
    if (matchingBucket) resultBuckets.push(matchingBucket);
    return resultBuckets;
  }
  _.each(responseAggs, agg => {
    if (agg.buckets) {
      _.each(agg.buckets, bucket => {
        resultBuckets = [
          ...resultBuckets,
          ...getAggConfigResult(bucket, aggId, bucketKey)
        ];
      });
    }
  });

  return resultBuckets;
};

const getOtherAggTerms = (requestAgg, key, otherAgg) => {
  return requestAgg['other-filter'].filters.filters[key].bool.must_not.map(filter => {
    if (filter.match_phrase && filter.match_phrase[otherAgg.params.field.name]) {
      return filter.match_phrase[otherAgg.params.field.name].query;
    }
    return null;
  }).filter(phrase => !!phrase);
};


export const OtherBucketHelperProvider = (Private) => {
  const AggConfig = Private(VisAggConfigProvider);

  const buildOtherBucketAgg = (aggsConfig, aggs, aggWithOtherBucket, response) => {
    const bucketAggs = aggsConfig.filter(agg => agg.type.type === 'buckets');
    const index = bucketAggs.findIndex(agg => agg.id === aggWithOtherBucket.id);

    // create filters aggregation
    const filterAgg = new AggConfig(aggsConfig[index].vis, {
      type: 'filters',
      id: 'other',
      schema: {
        group: 'buckets'
      }
    });

    // nest all the child aggregations of aggWithOtherBucket
    const resultAgg = {
      aggs: getAggConfig(aggs, aggWithOtherBucket).aggs,
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

      if (agg.buckets.find(bucket => bucket.key === '__missing__')) {
        filters.push(buildExistsFilter(aggWithOtherBucket.params.field, aggWithOtherBucket.params.field.indexPattern));
      }

      // create not filters for all the buckets
      _.each(agg.buckets, bucket => {
        const filter = currentAgg.createFilter(bucket.key);
        filter.meta.negate = true;
        filters.push(filter);
      });

      resultAgg.filters.filters[key] = { bool: {} };
      resultAgg.filters.filters[key].bool = buildQueryFromFilters(filters, _.noop);
    };
    walkBucketTree(0, response.aggregations, bucketAggs[0].id, [], '');

    return () => {
      return {
        'other-filter': resultAgg
      };
    };
  };

  const mergeOtherBucketAggResponse = (aggsConfig, response, otherResponse, otherAgg, requestAgg) => {
    _.each(otherResponse.aggregations['other-filter'].buckets, (bucket, key) => {
      const bucketKey = key.replace(/^-/, '');
      const aggResultBuckets = getAggResultBuckets(aggsConfig, response.aggregations, otherAgg, bucketKey);
      const requestFilterTerms = getOtherAggTerms(requestAgg, key, otherAgg);

      bucket.filter = buildPhrasesFilter(otherAgg.params.field, requestFilterTerms, otherAgg.params.field.indexPattern);
      bucket.filter.meta.negate = true;
      bucket.key = otherAgg.params.otherBucketLabel;
      aggResultBuckets.push(bucket);
    });
  };

  const updateMissingBucket = (response, aggConfigs, agg) => {
    const aggResultBuckets = getAggConfigResult(response.aggregations, agg.id, '__missing__');
    aggResultBuckets.forEach(bucket => {
      bucket.key = agg.params.missingBucketLabel;
      bucket.filter = buildExistsFilter(agg.params.field, agg.params.field.indexPattern);
      bucket.filter.meta.negate = true;
    });
  };

  return { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket };
};
