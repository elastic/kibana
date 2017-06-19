import { get } from 'lodash';

export function getDocType(doc) {
  return get(doc, '_source.type') || doc._type;
}
