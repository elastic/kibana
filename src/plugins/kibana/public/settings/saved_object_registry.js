import _ from 'lodash';
const registry = [];
export default {
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
