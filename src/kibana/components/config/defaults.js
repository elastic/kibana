define(function (require) {
  var _ = require('utils/mixins');

  return _.flattenWith('.', {
    defaultIndex: 'logstash-*',
    refreshInterval: 10000
  });
});