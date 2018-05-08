import _ from 'lodash';
import {
  Control,
  noValuesDisableMsg,
  noIndexPatternMsg,
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

  async fetch() {
    const indexPattern = this.filterManager.getIndexPattern();
    if (!indexPattern) {
      this.disable(noIndexPatternMsg(this.controlParams.indexPattern));
      return;
    }

    const fieldName = this.filterManager.fieldName;

    const aggs = minMaxAgg(indexPattern.fields.byName[fieldName]);
    const searchSource = createSearchSource(this.kbnApi, null, indexPattern, aggs, this.useTimeFilter);

    const resp = await searchSource.fetch();

    let minMaxReturnedFromAggregation = true;
    let min = _.get(resp, 'aggregations.minAgg.value');
    let max = _.get(resp, 'aggregations.maxAgg.value');
    if (min === null || max === null) {
      min = 0;
      max = 1;
      minMaxReturnedFromAggregation = false;
    }

    if (!minMaxReturnedFromAggregation) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
    } else {
      this.unsetValue = { min: min, max: min };
      this.min = min;
      this.max = max;
      this.enable = true;
    }

    return 'done';
  }
}

export async function rangeControlFactory(controlParams, kbnApi, useTimeFilter) {
  let indexPattern;
  try {
    indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  } catch (err) {
    // ignore not found error and return control so it can be displayed in disabled state.
  }
  const unsetValue = { min: 0, max: 1 };
  return new RangeControl(
    controlParams,
    new RangeFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, unsetValue),
    kbnApi,
    useTimeFilter
  );
}
