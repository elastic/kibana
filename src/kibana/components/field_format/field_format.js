define(function (require) {
  return function FieldFormatClassProvider() {
    var _ = require('lodash');
    var angular = require('angular');

    function FieldFormat(params) {
      this._params = params || {};
      this.type = this.constructor;
      this._paramDefaults = this.type.paramDefaults;

      // bind the public api
      this.convert = _.bind(this.convert, this);
      this.param = _.bind(this.param, this);
    }

    /**
     * Get the value of a param. This value may be a default value.
     *
     * @param  {string} name - the param name to fetch
     * @param  {any} val - the param name to fetch
     * @return {any}
     */
    FieldFormat.prototype.param = function (name) {
      var source = this._params[name] == null ? this._paramDefaults : this._params;
      return source[name];
    };

    FieldFormat.prototype.params = function () {
      return _.cloneDeep(this._params);
    };

    /**
     * Transform a value using the format
     *
     * @param  {any} value
     * @return {string}
     */
    FieldFormat.prototype.convert = function (value) {
      if (!this._convert) throw new Error('You must implement the #convert method in your Field Format');

      if (_.isArray(value)) {
        return angular.toJson(_.map(value, this.convert));
      } else {
        return this._convert(this._escape(value));
      }
    };

    /** Private API */
    FieldFormat.prototype.toJSON = function () {
      return { id: this.type.id, params: this._params };
    };

    FieldFormat.prototype._escape = function (v) {
      return typeof v === 'string' ? _.escape(v) : v;
    };

    return FieldFormat;
  };
});
