define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    let StubIndexPattern = Private(require('testUtils/stub_index_pattern'));
    let fieldTypes = Private(require('ui/index_patterns/_field_types'));
    let mockLogstashFields = Private(require('fixtures/logstash_fields'));

    let _ = require('lodash');

    let fields = mockLogstashFields.map(function (field) {
      field.displayName = field.name;
      let type = fieldTypes.byName[field.type];
      if (!type) throw new TypeError('unknown type ' + field.type);
      if (!_.has(field, 'sortable')) field.sortable = type.sortable;
      if (!_.has(field, 'filterable')) field.filterable = type.filterable;
      return field;
    });

    let indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
    indexPattern.id = 'logstash-*';

    return indexPattern;

  };
});
