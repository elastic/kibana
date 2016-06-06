define(function (require) {
  const _ = require('lodash');
  const registry = require('ui/registry/settings_sections');

  registry.register(_.constant({
    order: 1000,
    name: 'status',
    display: 'Status',
    url: '/status'
  }));
});
