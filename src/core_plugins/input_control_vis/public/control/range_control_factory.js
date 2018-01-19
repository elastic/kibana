import _ from 'lodash';
import {
  Control,
  noValuesDisableMsg
} from './control';
import { RangeFilterManager } from './filter_manager/range_filter_manager';
import { createSearchSource } from './create_search_source';

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

export async function rangeControlFactory(controlParams, kbnApi, useTimeFilter) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);

  const aggs = minMaxAgg(indexPattern.fields.byName[controlParams.fieldName]);
  const searchSource = createSearchSource(kbnApi, null, indexPattern, aggs, useTimeFilter);

  const resp = await searchSource.fetch();

  let minMaxReturnedFromAggregation = true;
  let min = _.get(resp, 'aggregations.minAgg.value');
  let max = _.get(resp, 'aggregations.maxAgg.value');
  if (min === null || max === null) {
    min = 0;
    max = 1;
    minMaxReturnedFromAggregation = false;
  }
  const emptyValue = { min: min, max: min };
  const rangeControl = new RangeControl(
    controlParams,
    new RangeFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, emptyValue),
    min,
    max
  );
  if (!minMaxReturnedFromAggregation) {
    rangeControl.disable(noValuesDisableMsg(controlParams.fieldName, indexPattern.title));
  }
  return rangeControl;
}
