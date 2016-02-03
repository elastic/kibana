define(function (require) {
  const registry = require('ui/registry/settings_sections');

  registry.register(() => ({
    order: 3,
    name: 'status',
    display: 'Status',
    url: '/status'
  }));
});
