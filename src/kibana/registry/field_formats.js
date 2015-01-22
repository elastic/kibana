define(function (require) {
  var _ = require('lodash');

  return require('registry/_registry')({
    name: 'fieldFormats',
    index: ['name'],
    group: ['compatability'],

    constructor: function (config) {
      this.defaultForType = function (type) {
        var name = config.get('deafultFormat:' + type);
        return this.byName[name] || _.asString;
      };
    }
  });
});