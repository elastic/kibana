/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import { RangeFilterParams, buildRangeFilter } from '@kbn/es-query';
import { FilterManager } from './filter_manager';

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
  createFilter(value: SliderValue): ReturnType<typeof buildRangeFilter> {
    const indexPattern = this.getIndexPattern()!;
    const newFilter = buildRangeFilter(
      indexPattern.fields.getByName(this.fieldName)!,
      toRange(value),
      indexPattern
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
    if (_.has(kbnFilters[0], 'query.script')) {
      range = _.get(kbnFilters[0], 'query.script.script.params');
    } else {
      range = _.get(kbnFilters[0], ['query', 'range', this.fieldName]);
    }

    if (!range) {
      return;
    }

    return fromRange(range);
  }
}
