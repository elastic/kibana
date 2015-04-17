define(function (require) {
  var fieldFormats = require('registry/field_formats');
  fieldFormats.register(require('components/stringify/types/Anchor'));
  fieldFormats.register(require('components/stringify/types/Bytes'));
  fieldFormats.register(require('components/stringify/types/Date'));
  fieldFormats.register(require('components/stringify/types/Ip'));
  fieldFormats.register(require('components/stringify/types/Number'));
  fieldFormats.register(require('components/stringify/types/NumeralJs'));
  fieldFormats.register(require('components/stringify/types/Percentage'));
  fieldFormats.register(require('components/stringify/types/String'));
});
