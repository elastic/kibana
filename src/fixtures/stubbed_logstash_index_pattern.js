import _ from 'lodash';
import TestUtilsStubIndexPatternProvider from 'test_utils/stub_index_pattern';
import IndexPatternsFieldTypesProvider from 'ui/index_patterns/_field_types';
import FixturesLogstashFieldsProvider from 'fixtures/logstash_fields';
export default function stubbedLogstashIndexPatternService(Private) {
  const StubIndexPattern = Private(TestUtilsStubIndexPatternProvider);
  const fieldTypes = Private(IndexPatternsFieldTypesProvider);
  const mockLogstashFields = Private(FixturesLogstashFieldsProvider);


  const fields = mockLogstashFields.map(function (field) {
    field.displayName = field.name;
    const type = fieldTypes.byName[field.type];
    if (!type) throw new TypeError('unknown type ' + field.type);
    if (!_.has(field, 'sortable')) field.sortable = type.sortable;
    if (!_.has(field, 'filterable')) field.filterable = type.filterable;
    return field;
  });

  const indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
  indexPattern.id = 'logstash-*';

  return indexPattern;

}
