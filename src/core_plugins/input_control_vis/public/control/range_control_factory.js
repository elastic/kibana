import _ from 'lodash';
import { Control } from './control';
import { RangeFilterManager } from './filter_manager/range_filter_manager';

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

class RangeControl extends Control {
  constructor(controlParams, filterManager, min, max) {
    super(controlParams, filterManager);
    this.min = min;
    this.max = max;
  }
}

export async function rangeControlFactory(controlParams, kbnApi) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  const searchSource = new kbnApi.SearchSource();
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(minMaxAgg(indexPattern.fields.byName[controlParams.fieldName]));

  const resp = await searchSource.fetch();

  const min = _.get(resp, 'aggregations.minAgg.value');
  const max = _.get(resp, 'aggregations.maxAgg.value');
  const emptyValue = { min: min, max: min };
  return new RangeControl(
    controlParams,
    new RangeFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, emptyValue),
    min,
    max
  );
}
