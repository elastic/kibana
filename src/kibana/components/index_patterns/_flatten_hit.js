// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');

  return function flattenHit(indexPattern, hit) {
    if (hit.$$_flattened) return hit.$$_flattened;

    var fields = indexPattern.fields;
    var flatSource = flattenSearchResponse(indexPattern, hit._source);
    var flatFields = _(flattenSearchResponse(indexPattern, hit.fields))
    .omit(function (val, name) {
      var field = fields.byName[name];
      if (field && !field.scripted && !_.has(flatSource, name)) {
        return true;
      } else {
        return false;
      }
    })
    .value();

    hit.$$_flattened = _.merge(
      flatSource,
      flatFields,
      _.pick(hit, indexPattern.metaFields)
    );

    return hit.$$_flattened;
  };
});
