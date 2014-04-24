define(function (require) {
  var module = require('modules').get('kibana/services');

  module.service('rootSearch', function (courier, config, timefilter, indexPatterns) {
    return courier.createSource('search')
      .index(config.get('defaultIndex'))
      .filter(function (source) {
        return source.getFields()
        .then(function (fields) {
          // dynamic time filter will be called in the _flatten phase of things
          return timefilter.get(fields);
        });
      });
  });
});