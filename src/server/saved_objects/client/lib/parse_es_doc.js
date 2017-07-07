import { get } from 'lodash';

export function parseEsDoc(doc, overrides = {}) {
  if (!doc) return {};

  const type = overrides.type || get(doc, '_source.type', doc._type);
  const id = doc._id.replace(`${type}:`, '');
  const attributes =  get(doc, `_source.${type}`) || doc._source;

  return Object.assign({}, {
    id,
    type,
    version: doc._version,
    attributes
  }, overrides);
}
