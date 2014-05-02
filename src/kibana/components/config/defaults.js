define(function (require) {
  var _ = require('utils/mixins');

  return _.flattenWith('.', {
    defaultIndex: null,
    refreshInterval: 10000
  });
});