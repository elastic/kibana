import _ from 'lodash';
define(function (require) {
  const registry = [];
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
