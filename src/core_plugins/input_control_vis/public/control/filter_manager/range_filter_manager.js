import _ from 'lodash';
import { FilterManager } from './filter_manager.js';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';

// Convert slider value into ES range filter
function toRange(sliderValue) {
  return {
    gte: sliderValue.min,
    lt: sliderValue.max
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
    return buildRangeFilter(
      this.indexPattern.fields.byName[this.fieldName],
      toRange(value),
      this.indexPattern);
  }

  findFilters() {
    const kbnFilters = _.flatten([this.queryFilter.getAppFilters(), this.queryFilter.getGlobalFilters()]);
    return kbnFilters.filter((kbnFilter) => {
      if (_.has(kbnFilter, 'script')
        && _.get(kbnFilter, 'meta.index') === this.indexPattern.id
        && _.get(kbnFilter, 'meta.field') === this.fieldName) {
        //filter is a scripted filter for this index/field
        return true;
      } else if (_.has(kbnFilter, ['range', this.fieldName]) && _.get(kbnFilter, 'meta.index') === this.indexPattern.id) {
        //filter is a match filter for this index/field
        return true;
      }
      return false;
    });
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
