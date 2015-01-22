// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');

  return function flattenHit(indexPattern, hit) {
    if (hit.$$_flattened) return hit.$$_flattened;

    var fields = indexPattern.fields;
    var flat = _({});

    // start with the _source values
    flat.assign(flattenSearchResponse(indexPattern, hit._source));

    // mix in scripted fields and stuff not in the mapping
    flat.assign(
      flattenSearchResponse(indexPattern, hit.fields)
      .pick(function (val, name) {
        var field = fields.byName[name];
        return (field && field.scripted) || !flat.has(name);
      })
    );

    // add the metaFields (id, type, etc.)
    flat.assign(_.pick(hit, indexPattern.metaFields));

    // cache the result
    return (hit.$$_flattened = flat.value());
  };
});
