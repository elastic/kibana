define(function (require) {
  var _ = require('lodash');

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['id'],
    group: ['fieldType'],

    constructor: function (config, $rootScope) {
      var self = this;
      var defaultMap;

      function init() {
        parseDefaultTypeMap();
        $rootScope.$on('init:config', parseDefaultTypeMap);
        $rootScope.$on('change:config.format:defaultTypeMap', parseDefaultTypeMap);
      }

      /**
       * Get a FieldFormat type (class) by it's id.
       *
       * @param  {String} formatId - the format id
       * @return {Function}
       */
      self.type = function (formatId) {
        return self.byId[formatId];
      };

      /**
       * Get the singleton instance of the FieldFormat type by it's id.
       *
       * @param  {String} formatId
       * @return {FieldFormat}
       */
      self.instance = _.memoize(function (formatId) {
        var FieldFormat = self.byId[formatId];
        return new FieldFormat();
      });

      /**
       * Get the id of the default type for this field type
       * using the format:defaultTypeMap config map
       *
       * @param  {String} fieldType - the field type
       * @return {String}
       */
      self.defaultTypeId = function (fieldType) {
        return defaultMap[fieldType] || defaultMap._default_;
      };

      /**
       * Get the default FieldFormat type (class) for
       * a field type, using the format:defaultTypeMap.
       *
       * @param  {String} fieldType
       * @return {Function}
       */
      self.defaultType = function (fieldType) {
        return self.byId[self.defaultTypeId(fieldType)];
      };

      /**
       * Get the default fieldFormat instance for a field format.
       *
       * @param  {String} fieldType
       * @return {FieldFormat}
       */
      self.defaultInstance = _.memoize(function (fieldType) {
        return self.instance(self.defaultTypeId(fieldType));
      });

      function parseDefaultTypeMap() {
        defaultMap = config.get('format:defaultTypeMap');
        _.forOwn(self, function (fn) {
          if (_.isFunction(fn) && fn.cache) {
            // clear all memoize caches
            fn.cache = {};
          }
        });
      }

      init();
    }
  });
});
