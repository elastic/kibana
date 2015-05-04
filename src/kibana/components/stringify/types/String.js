define(function (require) {
  return function _StringProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));

    require('components/field_format_editor/samples/samples');

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

    _String.paramDefaults = {
      transform: false
    };

    _String.editor = require('text!components/stringify/editors/string.html');

    _String.transformOpts = [
      { id: false, name: '- none -' },
      { id: 'lower', name: 'Lower Case' },
      { id: 'upper', name: 'Upper Case' },
      { id: 'short', name: 'Short Dots' }
    ];

    _String.sampleInputs = [
      'A Quick Brown Fox.',
      'com.organizations.project.ClassName',
      'hostname.net'
    ];

    _String.prototype._convert = function (val) {
      switch (this.param('transform')) {
      case 'lower': return String(val).toLowerCase();
      case 'upper': return String(val).toUpperCase();
      case 'short': return _.shortenDottedString(val);
      default: return _.asPrettyString(val);
      }
    };

    return _String;
  };
});
