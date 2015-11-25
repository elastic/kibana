define(function (require) {
  function stubbedDocSourceResponse(Private) {
    var mockLogstashFields = Private(require('fixtures/logstash_fields'));

    return function (id, index) {
      index = index || '.kibana';
      return {
        _id: id,
        _index: index,
        _type: 'index-pattern',
        _version: 2,
        found: true,
        _source: {
          customFormats: '{}',
          fields: JSON.stringify(mockLogstashFields)
        }
      };
    };
  }

  return stubbedDocSourceResponse;
});