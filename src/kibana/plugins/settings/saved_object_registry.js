define(function (require) {
  var _ = require('lodash');
  var registry = [];
  return {
    register: function (service) {
      registry.push(service);
    },
    all: function () {
      return registry;
    },
    get: function (id) {
      return _.find(registry, { service: id });
    }
  };
});
