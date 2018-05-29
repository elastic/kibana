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
