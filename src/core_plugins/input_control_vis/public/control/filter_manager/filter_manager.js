export class FilterManager {

  constructor(fieldName, indexPattern, queryFilter, unsetValue) {
    this.fieldName = fieldName;
    this.indexPattern = indexPattern;
    this.queryFilter = queryFilter;
    this.unsetValue = unsetValue;
  }

  createFilter() {
    throw new Error('Must implement createFilter.');
  }

  findFilters() {
    throw new Error('Must implement findFilters.');
  }

  getValueFromFilterBar() {
    throw new Error('Must implement getValueFromFilterBar.');
  }

  getUnsetValue() {
    return this.unsetValue;
  }
}
