define(function (require) {
  var _ = require('lodash');

  // when the registry is empty or the default for a
  // field type is not set, we will provide this
  // as a hard-coded fallback.
  var defaultFallbackFormat = { convert: _.asPrettyString, name: '' };

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['name'],
    group: ['fieldType'],


    constructor: function (config) {
      this.for = function (type, fallbackFormat) {
        var map = config.get('defaultFieldFormats');
        var name = map[type] || map._default_;
        return this.byName[name] || (fallbackFormat || defaultFallbackFormat);
      };
    }
  });
});
