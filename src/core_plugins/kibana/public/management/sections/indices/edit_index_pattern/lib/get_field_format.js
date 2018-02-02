import _ from 'lodash';

export function getFieldFormat(indexPattern, fieldName) {
  return _.get(indexPattern, ['fieldFormatMap', fieldName, 'type', 'title']);
}
