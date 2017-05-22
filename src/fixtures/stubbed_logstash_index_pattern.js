import TestUtilsStubIndexPatternProvider from 'test_utils/stub_index_pattern';
import FixturesLogstashFieldsProvider from 'fixtures/logstash_fields';
import { castEsToKbnFieldType } from '../utils';

export default function stubbedLogstashIndexPatternService(Private) {
  const StubIndexPattern = Private(TestUtilsStubIndexPatternProvider);
  const mockLogstashFields = Private(FixturesLogstashFieldsProvider);

  const fields = mockLogstashFields.map(function (field) {
    const kbnType = castEsToKbnFieldType(field.type);
    return {
      ...field,
      sortable: ('sortable' in field) ? !!field.sortable : kbnType.sortable,
      filterable: ('filterable' in field) ? !!field.filterable : kbnType.filterable,
      displayName: field.name,
    };
  });

  const indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
  indexPattern.id = 'logstash-*';

  return indexPattern;

}
