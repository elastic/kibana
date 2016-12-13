import MapperService from 'ui/index_patterns/_mapper';
import stubbedLogstashFields from 'fixtures/logstash_fields';
import sinon from 'auto-release-sinon';

export function stubMapper(Private, mockLogstashFields = Private(stubbedLogstashFields)) {
  const stubbedMapper = Private(MapperService);

  sinon.stub(stubbedMapper, 'getFieldsForIndexPattern', function () {
    return Promise.resolve(mockLogstashFields.filter(field => field.scripted === false));
  });

  sinon.stub(stubbedMapper, 'clearCache', function () {
    return Promise.resolve();
  });

  return stubbedMapper;
}
