import { get } from 'lodash';
import { V6_TYPE } from '../saved_objects_client';

export function normalizeEsDoc(doc, overrides = {}) {
  if (!doc) return {};

  let type;
  let id =  doc._id;
  let attributes;

  if (doc._type === V6_TYPE) {
    type = overrides.type || get(doc, '_source.type');
    attributes = get(doc, `_source.${type}`);

    // migrated v5 indices and objects created with a specified ID
    // have the type prefixed to the id.
    id = doc._id.replace(`${type}:`, '');
  } else {
    type = overrides.type || doc._type;
    attributes = doc._source;
  }

  return Object.assign({}, {
    id,
    type,
    version: doc._version,
    attributes
  }, overrides);
}
