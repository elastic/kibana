define(function (require) {
  var _ = require('lodash');

  // when the registry is empty or the default for a
  // field type is not set, we will provide this
  // as the "default" format.
  var fallbackFormat = { convert: _.asString };

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['name'],
    group: ['compatability'],


    constructor: function (config) {

      this.defaultFor = function (type) {
        var name = config.get('defaultFormat:' + type);
        return this.byName[name] || fallbackFormat;
      };

      this.converterFor = function (type) {
        return this.defaultFor(type).convert;
      };
    }
  });
});