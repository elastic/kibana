import _ from 'lodash';
import { contentTypesSetup } from './content_types';

export function FieldFormat(params) {
  // give the constructor a more appropriate name
  this.type = this.constructor;

  // keep the params and defaults seperate
  this._params = params || {};

  // one content type, so assume text
  if (_.isFunction(this._convert)) {
    this._convert = { text: this._convert };
  }

  contentTypesSetup(this);
}

FieldFormat.from = function (converter) {
  class FieldFormatFromConverter extends FieldFormat {}
  FieldFormatFromConverter.prototype._convert = converter;
  return FieldFormatFromConverter;
};

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
 * Get parameter defaults
 * @return {object} - parameter defaults
 */
FieldFormat.prototype.getParamDefaults = function () {
  return {};
};

/**
 * Get the value of a param. This value may be a default value.
 *
 * @param  {string} name - the param name to fetch
 * @return {any}
 */
FieldFormat.prototype.param = function (name) {
  const val = this._params[name];
  if (val || val === false || val === 0) {
    // truthy, false, or 0 are fine
    // '', NaN, null, undefined, etc are not
    return val;
  }

  return this.getParamDefaults()[name];
};

/**
 * Get all of the params in a single object
 * @return {object}
 */
FieldFormat.prototype.params = function () {
  return _.cloneDeep(_.defaults({}, this._params, this.getParamDefaults()));
};

/**
 * serialize this format to a simple POJO, with only the params
 * that are not default
 *
 * @return {object}
 */
FieldFormat.prototype.toJSON = function () {
  const type = this.type;
  const defaults = this.getParamDefaults();

  let params = _.transform(this._params, function (uniqParams, val, param) {
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
