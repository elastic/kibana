define(function (require) {
  var _ = require('lodash');
  return function (filters) {
    return _(filters)
      .filter(function (filter) {
        return filter.meta.apply;
      })
      .value();
  };
});

