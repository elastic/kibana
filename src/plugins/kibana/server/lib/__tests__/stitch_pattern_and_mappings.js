const expect = require('expect.js');
const stitchPatternAndMappings = require('../stitch_pattern_and_mappings');

const indexPattern = {
  title: 'logstash-*',
  timeFieldName: '@timestamp',
  fields: [
    {
      name: 'geo.coordinates',
      count: 0,
      scripted: false
    },
    {
      name: 'ip',
      count: 2,
      scripted: false,
    }
  ]
};

const mappings = {
  'geo.coordinates': {
    index: 'not_analyzed',
    type: 'geo_point',
    doc_values: false
  },
  'ip': {
    index: 'not_analyzed',
    type: 'ip',
    doc_values: true
  }
};

const correctResult = {
  'title': 'logstash-*',
  'timeFieldName': '@timestamp',
  'fields': [
    {
      'name': 'geo.coordinates',
      'count': 0,
      'scripted': false,
      'mapping': {
        'index': 'not_analyzed',
        'type': 'geo_point',
        'doc_values': false
      }
    },
    {
      'name': 'ip',
      'count': 2,
      'scripted': false,
      'mapping': {
        'index': 'not_analyzed',
        'type': 'ip',
        'doc_values': true
      }
    }
  ]
};

describe('stitchPatternAndMappings', function () {

  it('should fill in the mapping info in a given index pattern with a provided list of mappings', function () {
    var result = stitchPatternAndMappings(indexPattern, mappings);
    expect(result).to.eql(correctResult);
    expect(result).to.have.property('fields');
    expect(result.fields[0].mapping.type).to.be('geo_point');
  });

});
