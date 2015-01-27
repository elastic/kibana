define(function (require) {
  var _ = require('lodash');

  // when the registry is empty or the default for a
  // field type is not set, we will provide this
  // as the "default" format.
  var defaultFallbackFormat = { convert: _.asString, name: '' };

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['name'],
    group: ['fieldType'],


    constructor: function (config) {
      this.defaultFor = function (type, fallbackFormat) {
        var name = config.get('defaultFormat:' + type);
        return this.byName[name] || (fallbackFormat || defaultFallbackFormat);
      };

      this.converterFor = function (type) {
        return this.defaultFor(type).convert;
      };
    }
  });
});