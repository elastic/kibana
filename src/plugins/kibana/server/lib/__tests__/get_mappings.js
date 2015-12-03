const expect = require('expect.js');
const getMappings = require('../get_mappings');
const indexTemplate = require('../../../../../fixtures/index_template.json');
const fieldMappings = require('../../../../../fixtures/field_mapping_multi_index.json');

const correctResult = {
  'agent': {
    index: 'analyzed',
    type: 'string',
    doc_values: false
  },
  '@timestamp': {
    index: 'not_analyzed',
    type: 'date',
    doc_values: true
  },
  bytes: {
    index: 'not_analyzed',
    type: 'number',
    doc_values: true
  },
  ip: {
    index: 'not_analyzed',
    type: 'ip',
    doc_values: true
  },
  'geo.coordinates': {
    index: 'not_analyzed',
    type: 'geo_point',
    doc_values: false
  }
};

function mockCallWithRequestWithTemplate(endpoint, params) {
  if (endpoint === 'indices.getTemplate') {
    return Promise.resolve(indexTemplate);
  }
}

function mockCallWithRequestNoTemplate(endpoint, params) {
  if (endpoint === 'indices.getTemplate') {
    return Promise.reject();
  }
  if (endpoint === 'indices.getFieldMapping') {
    return Promise.resolve(fieldMappings);
  }
}

describe('getMappings', function () {

  it('should return an object with field mappings for a given index pattern keyed by the field names', function () {
    return getMappings('logstash-*', mockCallWithRequestWithTemplate)
    .then(function (result) {
      expect(result).to.be.eql(correctResult);
      expect(result).to.only.have.keys(['agent', '@timestamp', 'bytes', 'ip', 'geo.coordinates']);
      expect(result.agent).to.only.have.keys(['index', 'type', 'doc_values']);
    });
  });

  it('should return mappings directly from the indices when no index template exists', function () {
    return getMappings('logstash-*', mockCallWithRequestNoTemplate)
    .then(function (result) {
      expect(result).to.be.eql(correctResult);
      expect(result).to.only.have.keys(['agent', '@timestamp', 'bytes', 'ip', 'geo.coordinates']);
      expect(result.agent).to.only.have.keys(['index', 'type', 'doc_values']);
    });
  });

});
