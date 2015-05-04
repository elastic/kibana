define(function (require) {
  return function FieldObjectProvider(Private, shortDotsFilter, $rootScope, Notifier) {
    var notify = new Notifier({ location: 'IndexPattern Field' });
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var fieldFormats = Private(require('registry/field_formats'));
    var ObjDefine = require('utils/obj_define');

    function Field(indexPattern, spec) {
      // unwrap old instances of Field
      if (spec instanceof Field) spec = spec.$$spec;

      // constuct this object using ObjDefine class, which
      // extends the Field.prototype but gets it's properties
      // defined using the logic below
      var obj = new ObjDefine(spec, Field.prototype);

      if (spec.name === '_source') {
        spec.type = '_source';
      }

      // find the type for this field, fallback to unkown type
      var type = fieldTypes.byName[spec.type];
      if (spec.type && !type) {
        notify.error(
          'Unkown field type "' + spec.type + '"' +
          ' for field "' + spec.name + '"' +
          ' in indexPattern "' + indexPattern.id + '"'
        );
      }

      if (!type) type = fieldTypes.byName.unknown;

      var format = spec.format;
      if (!format || !(format instanceof FieldFormat)) {
        format = indexPattern.fieldFormatMap[spec.name] || fieldFormats.getDefaultInstance(spec.type);
      }

      var indexed = !!spec.indexed;
      var scripted = !!spec.scripted;
      var sortable = indexed && type.sortable;
      var bucketable = indexed || scripted;
      var filterable = spec.name === '_id' || scripted || (indexed && type.filterable);

      obj.fact('name');
      obj.fact('type');
      obj.writ('count', spec.count || 0);

      // scripted objs
      obj.fact('scripted', scripted);
      obj.writ('script', scripted ? spec.script : null);
      obj.writ('lang', scripted ? (spec.lang || 'expression') : null);

      // mapping info
      obj.fact('indexed', indexed);
      obj.fact('analyzed', !!spec.analyzed);
      obj.fact('doc_values', !!spec.doc_values);

      // usage flags, read-only and won't be saved
      obj.comp('format', format);
      obj.comp('sortable', sortable);
      obj.comp('bucketable', bucketable);
      obj.comp('filterable', filterable);

      // computed values
      obj.comp('indexPattern', indexPattern);
      obj.comp('displayName', shortDotsFilter(spec.name));
      obj.comp('$$spec', spec);

      return obj.create();
    }

    Field.prototype.routes = {
      edit: '/settings/indices/{{indexPattern.id}}/field/{{name}}'
    };

    return Field;
  };
});
