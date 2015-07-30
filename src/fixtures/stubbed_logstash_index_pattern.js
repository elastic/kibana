define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('testUtils/stubIndexPattern'));
    var fieldTypes = Private(require('ui/index_patterns/_field_types'));
    var mockLogstashFields = Private(require('fixtures/logstash_fields'));

    var _ = require('lodash');

    var fields = mockLogstashFields.map(function (field) {
      field.displayName = field.name;
      var type = fieldTypes.byName[field.type];
      if (!type) throw new TypeError('unknown type ' + field.type);
      if (!_.has(field, 'sortable')) field.sortable = type.sortable;
      if (!_.has(field, 'filterable')) field.filterable = type.filterable;
      return field;
    });

    var indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
    indexPattern.id = 'logstash-*';

    return indexPattern;

  };
});
