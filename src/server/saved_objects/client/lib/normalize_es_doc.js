import { get } from 'lodash';

export function normalizeEsDoc(doc, overrides = {}) {
  if (!doc) return {};

  const type = overrides.type || get(doc, '_source.type', doc._type);

  // migrated v5 indices and objects created with a specified ID
  // have the type prefixed to the id.
  const id = doc._id.replace(`${type}:`, '');

  const attributes =  doc._type === 'doc' ? get(doc, `_source.${type}`) : doc._source;

  return Object.assign({}, {
    id,
    type,
    version: doc._version,
    attributes
  }, overrides);
}
