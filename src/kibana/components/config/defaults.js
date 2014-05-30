define(function (require) {
  var _ = require('utils/mixins');

  return _.flattenWith('.', {
    dateFormat: 'MMMM Do YYYY, HH:mm:ss.SSS',
    defaultIndex: null,
    refreshInterval: 10000,

    'histogram:barTarget': 50,
    'histogram:maxBars': 100,
  });
});