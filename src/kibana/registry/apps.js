define(function (require) {
  var Registry = require('utils/registry/registry');
  return new Registry({
    index: ['name'],
    initialSet: []
  });
});