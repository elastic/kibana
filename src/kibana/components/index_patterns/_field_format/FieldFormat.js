define(function (require) {
  return function FieldFormatClassProvider(config, $rootScope, Private) {
    var _ = require('lodash');
    var contentTypes = Private(require('components/index_patterns/_field_format/contentTypes'));

    function FieldFormat(params) {
      var self = this;

      // give the constructor a more appropriate name
      self.type = self.constructor;

      // keep the params and defaults seperate
      self._params = params || {};
      self._paramDefaults = self.type.paramDefaults || {};

      // one content type, so assume text
      if (_.isFunction(self._convert)) {
        self._convert = { text: self._convert };
      }

      contentTypes.setup(self);
    }

    /**
     * Convert a raw value to a formated string
     * @param  {any} value
     * @param  {string} [contentType=text] - optional content type, the only two contentTypes
     *                                currently supported are "html" and "text", which helps
     *                                formatters adjust to different contexts
     * @return {string} - the formatted string, which is assumed to be html, safe for
     *                    injecting into the DOM or a DOM attribute
     */
    FieldFormat.prototype.convert = function (value, contentType) {
      return this.getConverterFor(contentType)(value);
    };

    /**
     * Get a convert function that is bound to a specific contentType
     * @param  {string} [contentType=text]
     * @return {function} - a bound converter function
     */
    FieldFormat.prototype.getConverterFor = function (contentType) {
      return this._convert[contentType || 'text'];
    };

    /**
     * Get the value of a param. This value may be a default value.
     *
     * @param  {string} name - the param name to fetch
     * @return {any}
     */
    FieldFormat.prototype.param = function (name) {
      var val = this._params[name];
      if (val || val === false || val === 0) {
        // truthy, false, or 0 are fine
        // '', NaN, null, undefined, etc are not
        return val;
      }

      return this._paramDefaults[name];
    };

    /**
     * Get all of the params in a single object
     * @return {object}
     */
    FieldFormat.prototype.params = function () {
      return _.cloneDeep(_.defaults({}, this._params, this._paramDefaults));
    };

    /**
     * serialize this format to a simple POJO, with only the params
     * that are not default
     *
     * @return {object}
     */
    FieldFormat.prototype.toJSON = function () {
      var type = this.type;
      var defaults = this._paramDefaults;

      var params = _.transform(this._params, function (uniqParams, val, param) {
        if (val !== defaults[param]) {
          uniqParams[param] = val;
        }
      }, {});

      if (!_.size(params)) {
        params = undefined;
      }

      return {
        id: type.id,
        params: params
      };
    };

    return FieldFormat;
  };
});
