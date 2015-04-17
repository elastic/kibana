define(function (require) {
  var _ = require('lodash');

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['id'],
    group: ['fieldType'],

    constructor: function (config, $rootScope) {
      var self = this;

      var defaultMap;
      setupDefaultHandling();
      $rootScope.$on('init:config', setupDefaultHandling);
      $rootScope.$on('change:config.defaultFieldFormats', setupDefaultHandling);

      function setupDefaultHandling() {
        defaultMap = config.get('defaultFieldFormats');

        self.for = _.memoize(function (type) {
          var id = defaultMap[type] || defaultMap._default_;
          var FieldFormat = this.byId[id];
          return new FieldFormat();
        });
      }
    }
  });
});
