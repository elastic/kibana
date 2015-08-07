define(function (require) {
  var _ = require('lodash');
  return function collectKeys(children) {
    var nextChildren = _.pluck(children, 'children');
    var keys = _.pluck(children, 'name');
    return _(nextChildren)
    .map(collectKeys)
    .flattenDeep()
    .union(keys)
    .value();
  };
});
