define(function (require) {
  var _ = require('lodash');
  return function (filters) {
    return _.filter(filters, 'meta.apply');
  };
});

