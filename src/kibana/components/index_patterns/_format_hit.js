// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formated version
define(function (require) {
  var _ = require('lodash');
  var flatten = require('components/index_patterns/_flatten_hit');

  function formatHit(indexPattern, hit) {
    var fields = indexPattern.fields.byName;
    return _.transform(flatten(indexPattern, hit), function (formatted, val, name) {
      var field = fields[name];
      formatted[name] = field ? field.format.convert(val) : _.asPrettyString(val);
    }, {});
  }

  return function cachedFormat(indexPattern, hit) {
    return hit.$$_formatted || (hit.$$_formatted = formatHit(indexPattern, hit));
  };

});
