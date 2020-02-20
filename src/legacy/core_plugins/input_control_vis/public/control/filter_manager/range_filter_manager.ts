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

import { FilterManager } from './filter_manager';
import {
  esFilters,
  RangeFilter,
  RangeFilterParams,
  IFieldType,
} from '../../../../../../plugins/data/public';

interface SliderValue {
  min?: string | number;
  max?: string | number;
}

// Convert slider value into ES range filter
function toRange(sliderValue: SliderValue) {
  return {
    gte: sliderValue.min,
    lte: sliderValue.max,
  };
}

// Convert ES range filter into slider value
function fromRange(range: RangeFilterParams): SliderValue {
  const sliderValue: SliderValue = {};
  if (_.has(range, 'gte')) {
    sliderValue.min = _.get(range, 'gte');
  }
  if (_.has(range, 'gt')) {
    sliderValue.min = _.get(range, 'gt');
  }
  if (_.has(range, 'lte')) {
    sliderValue.max = _.get(range, 'lte');
  }
  if (_.has(range, 'lt')) {
    sliderValue.max = _.get(range, 'lt');
  }
  return sliderValue;
}

export class RangeFilterManager extends FilterManager {
  /**
   * Convert slider value into filter
   *
   * @param {object} react-input-range value - POJO with `min` and `max` properties
   * @return {object} range filter
   */
  createFilter(value: SliderValue): RangeFilter {
    const newFilter = esFilters.buildRangeFilter(
      // TODO: Fix type to be required
      this.indexPattern.fields.getByName(this.fieldName) as IFieldType,
      toRange(value),
      this.indexPattern
    );
    newFilter.meta.key = this.fieldName;
    newFilter.meta.controlledBy = this.controlId;
    return newFilter;
  }

  getValueFromFilterBar(): SliderValue | undefined {
    const kbnFilters = this.findFilters();
    if (kbnFilters.length === 0) {
      return;
    }

    let range: RangeFilterParams;
    if (_.has(kbnFilters[0], 'script')) {
      range = _.get(kbnFilters[0], 'script.script.params');
    } else {
      range = _.get(kbnFilters[0], ['range', this.fieldName]);
    }

    if (!range) {
      return;
    }

    return fromRange(range);
  }
}
