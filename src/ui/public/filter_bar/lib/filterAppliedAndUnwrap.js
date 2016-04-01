define(function (require) {
  let _ = require('lodash');
  return function (filters) {
    return _.filter(filters, 'meta.apply');
  };
});

