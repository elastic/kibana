define(function (require) {
  return function FieldObjectProvider(Private, shortDotsFilter, $rootScope) {
    var _ = require('lodash');

    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var fieldFormats = Private(require('registry/field_formats'));

    function readonly(v) { return { value: v }; }
    function saved(v) { return { enumerable: true, value: v }; }
    function writable(v) { return { enumerable: true, writable: true, value: v }; }

    function fieldSetup(indexPattern, spec) {
      var type = fieldTypes.byName[spec.type];
      if (!type) throw new TypeError('unknown field type :' + spec.type);

      var format = fieldFormats.byName[spec.formatName] || fieldFormats.defaultFor(spec.type);
      var indexed = !!spec.indexed;
      var scripted = !!spec.scripted;
      var sortable = indexed && type.sortable;
      var bucketable = indexed || scripted;
      var filterable = spec.name === '_id' || scripted || (indexed && type.filterable);

      return Object.create(Object.prototype, {
        // basic field properties
        name: saved(spec.name),
        type: saved(spec.type),
        count: writable(spec.count || 0),
        formatName: writable(spec.formatName),

        // scripted fields
        scripted: saved(scripted),
        script: saved(spec.script || ''),
        lang: saved(spec.scripted ? (spec.lang || 'expression') : undefined),

        // mapping info
        indexed: saved(indexed),
        analyzed: saved(!!spec.analyzed),
        doc_values: saved(!!spec.doc_values),

        // usage flags, read-only and won't be saved
        format: readonly(format),
        sortable: readonly(sortable),
        bucketable: readonly(bucketable),
        filterable: readonly(filterable),
        indexPattern: readonly(indexPattern),

        // helper methods
        displayName: readonly(shortDotsFilter(spec.name))
      });
    }

    return fieldSetup;
  };
});
