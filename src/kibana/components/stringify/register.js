define(function (require) {
  var fieldFormats = require('registry/field_formats');
  fieldFormats.register(require('components/stringify/types/string'));
  fieldFormats.register(require('components/stringify/types/anchor'));
  fieldFormats.register(require('components/stringify/types/date'));
  fieldFormats.register(require('components/stringify/types/number'));
  fieldFormats.register(require('components/stringify/types/bytes'));
  fieldFormats.register(require('components/stringify/types/percentage'));
  fieldFormats.register(require('components/stringify/types/ip'));
});
