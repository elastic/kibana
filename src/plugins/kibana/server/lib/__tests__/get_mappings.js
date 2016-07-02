const expect = require('expect.js');
const _ = require('lodash');
const getMappings = require('../get_mappings');
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

function mockCallWithRequestWithTypeConflict(endpoint, params) {
  if (endpoint === 'indices.getTemplate') {
    return Promise.reject();
  }
  if (endpoint === 'indices.getFieldMapping') {
    const conflictedMappings = _.cloneDeep(fieldMappings);
    conflictedMappings['logstash-2015.12.03'].mappings.apache.agent.mapping.agent.type = 'date';
    return Promise.resolve(conflictedMappings);
  }
}

describe('getMappings', function () {

  it('should return an object with field mappings for a given index pattern keyed by the field names', function () {
    return getMappings('logstash-*', mockCallWithRequestWithTemplate)
      .then(function (result) {
        expect(_.isEqual(result, correctResult)).to.be(true);
      });
  });

  it('should return mappings directly from the indices when no index template exists', function () {
    return getMappings('logstash-*', mockCallWithRequestNoTemplate)
      .then(function (result) {
        expect(_.isEqual(result, correctResult)).to.be(true);
      });
  });

  it('should mark a field\'s type as \'conflict\' if has different types across indices', function () {
    return getMappings('logstash-*', mockCallWithRequestWithTypeConflict)
      .then(function (result) {
        const correctResultWithConflict = _.cloneDeep(correctResult);
        correctResultWithConflict.agent.type = 'conflict';
        expect(_.isEqual(result, correctResultWithConflict)).to.be(true);
      });
  });

});
