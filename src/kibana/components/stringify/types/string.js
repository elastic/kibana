define(function (require) {
  return function _StringProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format'));

    _(_String).inherits(FieldFormat);
    function _String(params) {
      _String.Super.call(this, params);
    }

    _String.id = 'string';
    _String.title = 'String';
    _String.fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'attachment',
      'geo_point',
      'geo_shape',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];

    _String.prototype._convert = _.asPrettyString;

    return _String;
  };
});
