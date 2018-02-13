import { get } from 'lodash';

export function getFieldFormat(indexPattern, fieldName) {
  return indexPattern && fieldName ? get(indexPattern, ['fieldFormatMap', fieldName, 'type', 'title']) : '';
}
