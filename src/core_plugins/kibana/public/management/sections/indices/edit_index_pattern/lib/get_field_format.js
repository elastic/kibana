import { get } from 'lodash';

export function getFieldFormat(indexPattern, fieldName) {
  return get(indexPattern, ['fieldFormatMap', fieldName, 'type', 'title']);
}
