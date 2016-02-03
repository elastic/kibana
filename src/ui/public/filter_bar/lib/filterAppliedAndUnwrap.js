import _ from 'lodash';
define(function (require) {
  return function (filters) {
    return _.filter(filters, 'meta.apply');
  };
});

