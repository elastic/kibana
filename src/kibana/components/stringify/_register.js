define(function (require) {
  var fieldFormats = require('registry/field_formats');
  fieldFormats.register(require('components/stringify/bytes'));
  fieldFormats.register(require('components/stringify/date'));
  fieldFormats.register(require('components/stringify/ip'));
  fieldFormats.register(require('components/stringify/number'));
  fieldFormats.register(require('components/stringify/string'));
});
