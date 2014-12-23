// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  return function (hit) {
    if (hit.$$_flattened) return hit.$$_flattened;

    var self = this;
    var source = self.flattenSearchResponse(hit._source);
    var fields = _.omit(self.flattenSearchResponse(hit.fields), function (val, name) {
      var field = self.fields.byName[name];
      if (field && !field.scripted && !_.has(source, name)) {
        return true;
      } else {
        return false;
      }
    });

    return hit.$$_flattened = _.merge(source, fields, _.pick(hit, self.metaFields));
  };
});
