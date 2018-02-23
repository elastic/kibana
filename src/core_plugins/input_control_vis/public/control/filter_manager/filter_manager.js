import _ from 'lodash';

export class FilterManager {

  constructor(controlId, fieldName, indexPattern, queryFilter, unsetValue) {
    this.controlId = controlId;
    this.fieldName = fieldName;
    this.indexPattern = indexPattern;
    this.queryFilter = queryFilter;
    this.unsetValue = unsetValue;
  }

  getIndexPattern() {
    return this.indexPattern;
  }

  getField() {
    return this.indexPattern.fields.byName[this.fieldName];
  }

  createFilter() {
    throw new Error('Must implement createFilter.');
  }

  findFilters() {
    const kbnFilters = _.flatten([this.queryFilter.getAppFilters(), this.queryFilter.getGlobalFilters()]);
    return kbnFilters.filter((kbnFilter) => {
      return _.get(kbnFilter, 'meta.controlledBy') === this.controlId;
    });
  }

  getValueFromFilterBar() {
    throw new Error('Must implement getValueFromFilterBar.');
  }

  getUnsetValue() {
    return this.unsetValue;
  }
}
