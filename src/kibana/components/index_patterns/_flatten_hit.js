// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');

  function flattenHit(indexPattern, hit) {
    var flat = {};
    var fields = indexPattern.fields.byName;

    // assign the meta fields
    _.each(indexPattern.metaFields, function (meta) {
      flat[meta] = hit[meta];
    });

    // unwrap computed fields
    _.forOwn(hit.fields, function (val, key) {
      flat[key] = val[0];
    });

    // recursively merge _source
    (function flatten(obj, keyPrefix) {
      keyPrefix = keyPrefix ? keyPrefix + '.' : '';
      _.forOwn(obj, function (val, key) {
        key = keyPrefix + key;

        if (flat[key] !== void 0) return;
        if (fields[key] || !_.isPlainObject(val)) {
          flat[key] = val;
          return;
        }

        flatten(val, key);
      });
    }(hit._source));

    return flat;
  }

  return function cachedFlatten(indexPattern, hit) {
    return hit.$$_flattened || (hit.$$_flattened = flattenHit(indexPattern, hit));
  };
});
