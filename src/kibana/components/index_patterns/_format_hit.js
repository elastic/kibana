// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formated version
define(function (require) {
  var _ = require('lodash');

  return function (indexPattern, defaultFormat) {

    function transformField(memo, val, name) {
      var field = indexPattern.fields.byName[name];
      return memo[name] = field ? field.format.convert(val, 'html') : defaultFormat.convert(val, 'html');
    }

    function formatHit(hit) {
      if (hit.$$_formatted) return hit.$$_formatted;
      var cache = hit.$$_partialFormatted = hit.$$_formatted = {};

      _.forOwn(indexPattern.flattenHit(hit), function (val, fieldName) {
        transformField(cache, val, fieldName);
      });

      return hit.$$_formatted;
    }

    formatHit.formatField = function (hit, fieldName) {
      // formatHit was previously called
      if (hit.$$_formatted) return hit.$$_formatted[fieldName];

      var partial = hit.$$_partialFormatted;
      if (partial && _.has(partial, fieldName)) {
        return partial[fieldName];
      }

      if (!partial) {
        partial = hit.$$_partialFormatted = {};
      }

      return transformField(partial, indexPattern.flattenHit(hit)[fieldName], fieldName);
    };

    return formatHit;
  };

});
