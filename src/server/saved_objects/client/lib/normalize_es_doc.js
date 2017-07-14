import { V6_TYPE } from '../saved_objects_client';

function removeFromStart(string, value) {
  if (string.startsWith(value)) {
    return string.slice(value.length);
  } else {
    return string;
  }
}

export function normalizeEsDoc(doc, overrides = {}) {
  if (!doc) {
    return {};
  }

  if (doc._type === V6_TYPE) {
    const type = doc._source.type;
    return {
      id: removeFromStart(doc._id, `${type}:`),
      type: type,
      version: doc._version,
      attributes: doc._source[type],
      ...overrides
    };
  }

  return {
    id: doc._id,
    type: doc._type,
    version: doc._version,
    attributes: doc._source,
    ...overrides
  };
}
