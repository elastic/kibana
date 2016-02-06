import _ from 'lodash';
import TestUtilsStubIndexPatternProvider from 'testUtils/stub_index_pattern';
import IndexPatternsFieldTypesProvider from 'ui/index_patterns/_field_types';
import FixturesLogstashFieldsProvider from 'fixtures/logstash_fields';
export default function stubbedLogstashIndexPatternService(Private) {
  var StubIndexPattern = Private(TestUtilsStubIndexPatternProvider);
  var fieldTypes = Private(IndexPatternsFieldTypesProvider);
  var mockLogstashFields = Private(FixturesLogstashFieldsProvider);


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
