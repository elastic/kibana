// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  return function (hit) {
    var self = this;
    return _.merge(
      self.flattenSearchResponse(hit._source),
      self.flattenSearchResponse(hit.fields),
      _.pick(hit, self.metaFields)
    );
  };
});
