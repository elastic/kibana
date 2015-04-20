// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');

  function flattenHit(indexPattern, hit) {
    var flat = {};

    // recursively merge _source
    var fields = indexPattern.fields.byName;
    (function flatten(obj, keyPrefix) {
      keyPrefix = keyPrefix ? keyPrefix + '.' : '';
      _.forOwn(obj, function (val, key) {
        key = keyPrefix + key;

        if (flat[key] !== void 0) return;

        var hasValidMapping = (fields[key] && fields[key].type !== 'conflict');
        var isValue = !_.isPlainObject(val);

        if (hasValidMapping || isValue) {
          flat[key] = val;
          return;
        }

        flatten(val, key);
      });
    }(hit._source));

    // assign the meta fields
    _.each(indexPattern.metaFields, function (meta) {
      if (meta === '_source') return;
      flat[meta] = hit[meta];
    });

    // unwrap computed fields
    _.forOwn(hit.fields, function (val, key) {
      flat[key] = val[0];
    });

    return flat;
  }

  return function cachedFlatten(indexPattern, hit) {
    return hit.$$_flattened || (hit.$$_flattened = flattenHit(indexPattern, hit));
  };
});
