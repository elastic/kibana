import _ from 'lodash';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';

export class RangeFilterManager {
  constructor(fieldName, indexPattern, queryFilter, emptyValue) {
    this.fieldName = fieldName;
    this.indexPattern = indexPattern;
    this.queryFilter = queryFilter;
    this.emptyValue = emptyValue;
  }

  createFilter(range) {
    return buildRangeFilter(
      this.indexPattern.fields.byName[this.fieldName],
      range,
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
      return this.emptyValue;
    } else {
      let range = null;
      if (_.has(kbnFilters[0], 'script')) {
        range = _.get(kbnFilters[0], 'script.script.params');
      } else {
        range = _.get(kbnFilters[0], ['range', this.fieldName]);
      }

      const value = {};
      if (_.has(range, 'gte')) {
        value.min = _.get(range, 'gte');
      }
      if (_.has(range, 'gt')) {
        value.min = _.get(range, 'gt');
      }
      if (_.has(range, 'lte')) {
        value.max = _.get(range, 'lte');
      }
      if (_.has(range, 'lt')) {
        value.max = _.get(range, 'lt');
      }
      return value;
    }
  }
}
