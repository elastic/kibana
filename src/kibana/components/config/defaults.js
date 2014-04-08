define(function (require) {
  var _ = require('utils/mixins');

  return _.flattenWith('.', {
    refreshInterval: 10000
  });
});