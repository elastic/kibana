define(function (require) {
  return function FieldFormatClassProvider(config, $rootScope) {
    var _ = require('lodash');

    function FieldFormat(params) {
      var self = this;

      if (!self._convert) {
        throw new Error('#_convert must be implemented by the FieldFormat subclass');
      }

      // give the constructor a more appropriate name
      self.type = self.constructor;

      // keep the params and defaults seperate
      self._params = params || {};
      self._paramDefaults = self.type.paramDefaults || {};

      // memoize after default contentType is enforced so that
      // #getConverterFor() and #getConverterFor('default') are ===
      var getBoundConverter = _.memoize(function (contentType) {
        return function boundConverter(value) {
          if (value && typeof value.map === 'function') {
            // rudimentary array testing
            return JSON.stringify(value.map(boundConverter));
          } else {
            return self._convert(_.escape(value), contentType);
          }
        };
      });

      /**
       * Convert a raw value to a formated string
       * @param  {any} value
       * @param  {string} [contentType=html] - optional content type, the only two contentTypes
       *                                currently supported are "html" and "text", which helps
       *                                formatters adjust to different contexts
       * @return {string} - the formatted string, which is assumed to be html, safe for
       *                    injecting into the DOM
       */
      self.convert = function (value, contentType) {
        return self.getConverterFor(contentType)(value);
      };

      /**
       * Get a convert function that is bound to a specific contentType
       * @param  {string} [contentType=html]
       * @return {function} - a bound converter function, which accepts a single "value"
       *                      argument of any type
       */
      self.getConverterFor = function (contentType) {
        return getBoundConverter(contentType || 'html');
      };

      /**
       * Get the value of a param. This value may be a default value.
       *
       * @param  {string} name - the param name to fetch
       * @param  {any} val - the param name to fetch
       * @return {any}
       */
      self.param = function (name) {
        var val = this._params[name];
        if (val || val === false || val === 0) {
          // truthy, false, or 0 are find
          // '', NaN, null, undefined, etc are not
          return val;
        }

        return this._paramDefaults[name];
      };

      self.params = function () {
        return _.cloneDeep(this._params);
      };
    }

    FieldFormat.initConfig = function (input) {
      return _.transform(input, function (params, val, key) {
        if (!_.isString(val) || val.charAt(0) !== '=') {
          params[key] = val;
          return;
        }

        var configKey = val.substr(1);

        update();
        $rootScope.$on('init:config', update);
        $rootScope.$on('change:config.' + configKey, update);
        function update() {
          params[key] = config.get(configKey);
        }

      }, {});
    };

    FieldFormat.prototype.toJSON = function () {
      return { id: this.type.id, params: this._params };
    };

    return FieldFormat;
  };
});
