import _ from 'lodash';
import { FilterManager } from './filter_manager.js';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';

// Convert slider value into ES range filter
function toRange(sliderValue) {
  return {
    gte: sliderValue.min,
    lte: sliderValue.max
  };
}

// Convert ES range filter into slider value
function fromRange(range) {
  const sliderValue = {};
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
  createFilter(value) {
    const newFilter = buildRangeFilter(
      this.indexPattern.fields.byName[this.fieldName],
      toRange(value),
      this.indexPattern);
    newFilter.meta.controlledBy = this.controlId;
    return newFilter;
  }

  getValueFromFilterBar() {
    const kbnFilters = this.findFilters();
    if (kbnFilters.length === 0) {
      return this.getUnsetValue();
    } else {
      let range = null;
      if (_.has(kbnFilters[0], 'script')) {
        range = _.get(kbnFilters[0], 'script.script.params');
      } else {
        range = _.get(kbnFilters[0], ['range', this.fieldName]);
      }

      return fromRange(range);
    }
  }
}
