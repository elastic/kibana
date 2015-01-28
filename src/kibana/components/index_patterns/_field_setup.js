define(function (require) {
  return function FieldObjectProvider(Private, shortDotsFilter, $rootScope) {
    var _ = require('lodash');

    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var fieldFormats = Private(require('registry/field_formats'));
    var ObjWrap = require('utils/obj_wrap');

    function fieldSetup(indexPattern, spec) {
      var type = fieldTypes.byName[spec.type];
      if (!type) throw new TypeError('unknown field type :' + spec.type);

      var format = fieldFormats.byName[spec.formatName] || fieldFormats.defaultFor(spec.type);
      var indexed = !!spec.indexed;
      var scripted = !!spec.scripted;
      var sortable = indexed && type.sortable;
      var bucketable = indexed || scripted;
      var filterable = spec.name === '_id' || scripted || (indexed && type.filterable);

      var field = new ObjWrap(spec);
      field.fact('name');
      field.fact('type');
      field.writ('count', spec.count || 0);
      field.writ('formatName');

      // scripted fields
      field.fact('scripted', scripted);
      field.writ('script', scripted ? spec.script : null);
      field.writ('lang', scripted ? (spec.lang || 'expression') : null);

      // mapping info
      field.fact('indexed', indexed);
      field.fact('analyzed', !!spec.analyzed);
      field.fact('doc_values', !!spec.doc_values);

      // usage flags, read-only and won't be saved
      field.flag('format', format);
      field.flag('sortable', sortable);
      field.flag('bucketable', bucketable);
      field.flag('filterable', filterable);
      field.flag('indexPattern', indexPattern);
      field.flag('displayName', shortDotsFilter(spec.name));

      return field.create();
    }

    return fieldSetup;
  };
});
