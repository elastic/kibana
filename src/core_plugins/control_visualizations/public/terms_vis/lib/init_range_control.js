import _ from 'lodash';
import { RangeFilterManager } from './range_filter_manager';

const minMaxAgg = (field) => {
  const aggBody = {};
  if (field.scripted) {
    aggBody.script = {
      inline: field.script,
      lang: field.lang
    };
  } else {
    aggBody.field = field.name;
  }
  return {
    maxAgg: {
      max: aggBody
    },
    minAgg: {
      min: aggBody
    }
  };
};

export async function initRangeControl(controlParams, indexPatterns, SearchSource, queryFilter, callback) {
  const indexPattern = await indexPatterns.get(controlParams.indexPattern);
  const searchSource = new SearchSource();
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(minMaxAgg(indexPattern.fields.byName[controlParams.fieldName]));

  const defer = {};
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  defer.promise.then((resp) => {
    const min = _.get(resp, 'aggregations.minAgg.value');
    const max = _.get(resp, 'aggregations.maxAgg.value');
    const emptyValue = { min: min, max: min };
    const filterManager = new RangeFilterManager(controlParams.fieldName, indexPattern, queryFilter, emptyValue);
    callback({
      type: controlParams.type,
      indexPattern: indexPattern,
      field: indexPattern.fields.byName[controlParams.fieldName],
      label: controlParams.label ? controlParams.label : controlParams.fieldName,
      max: max,
      min: min,
      value: filterManager.getValueFromFilterBar(),
      filterManager: filterManager
    });
  });
  return searchSource._createRequest(defer);
}
