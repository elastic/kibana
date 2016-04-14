define(function (require) {
  let _ = require('lodash');
  return function collectKeys(children) {
    let nextChildren = _.pluck(children, 'children');
    let keys = _.pluck(children, 'name');
    return _(nextChildren)
    .map(collectKeys)
    .flattenDeep()
    .union(keys)
    .value();
  };
});
