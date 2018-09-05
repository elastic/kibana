import { forOwn, isPlainObject, each } from 'lodash';

export function flattenHit(hit, metaFields) {
  const flat = {};

  metaFields = metaFields || ['_type', '_index'];

  // recursively merge _source
  (function flatten(obj, keyPrefix) {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    forOwn(obj, (val, key) => {
      key = keyPrefix + key;

      if (flat[key] !== void 0) return;

      const isValue = !isPlainObject(val);

      if (isValue) {
        flat[key] = val;
        return;
      }

      flatten(val, key);
    });
  })(hit._source);

  // assign the meta fields
  each(metaFields, meta => {
    if (meta === '_source') return;
    flat[meta] = hit[meta];
  });

  // unwrap computed fields
  forOwn(hit.fields, (val, key) => {
    flat[key] = Array.isArray(val) && val.length === 1 ? val[0] : val;
  });

  return flat;
}
