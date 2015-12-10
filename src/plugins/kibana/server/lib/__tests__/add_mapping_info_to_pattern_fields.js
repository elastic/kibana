const expect = require('expect.js');
const addMappingInfoToPatternFields = require('../add_mapping_info_to_pattern_fields');
const indexPattern = require('../../../../../fixtures/index_pattern.json');
const indexTemplate = require('../../../../../fixtures/index_template.json')['kibana-logstash-*'];
const _ = require('lodash');

describe('addMappingInfoToPatternFields', function () {
  let testPattern;
  let testTemplate;

  beforeEach(function () {
    testPattern = _.cloneDeep(indexPattern);
    testTemplate = _.cloneDeep(indexTemplate);
  });

  it('should throw an error if either param is undefined', function () {
    expect(addMappingInfoToPatternFields).withArgs()
      .to.throwException(/indexPattern and template are required arguments/);
    expect(addMappingInfoToPatternFields).withArgs(testPattern)
      .to.throwException(/indexPattern and template are required arguments/);
    expect(addMappingInfoToPatternFields).withArgs(undefined, testTemplate)
      .to.throwException(/indexPattern and template are required arguments/);
  });

  it('should add mapping info from the provided template to the matching fields in the index pattern', function () {
    addMappingInfoToPatternFields(testPattern, testTemplate);
    expect(_.get(testPattern, 'fields[0]')).to.be.ok();
    expect(_.get(testPattern, 'fields[1]')).to.be.ok();
    expect(testPattern.fields[0]).to.have.property('type', 'geo_point');
    expect(testPattern.fields[0]).to.have.property('indexed', true);
    expect(testPattern.fields[0]).to.have.property('analyzed', false);
    expect(testPattern.fields[0]).to.have.property('doc_values', false);

    expect(testPattern.fields[1]).to.have.property('type', 'ip');
    expect(testPattern.fields[1]).to.have.property('indexed', true);
    expect(testPattern.fields[1]).to.have.property('analyzed', false);
    expect(testPattern.fields[1]).to.have.property('doc_values', true);
  });

  it('should detect conflicts in the template mappings and note them in the index pattern', function () {
    _.set(testTemplate, 'mappings.apache.properties', {
      ip: {
        index: 'not_analyzed',
        type: 'string',
        doc_values: true
      }
    });

    addMappingInfoToPatternFields(testPattern, testTemplate);

    expect(testPattern.fields[1]).to.have.property('type', 'conflict');
    expect(testPattern.fields[1]).to.have.property('indexed', false);
  });

  it('should override some elasticsearch metadata mappings', function () {
    _.set(testTemplate, 'mappings._default_.properties._source', {type: 'string'});
    _.set(testPattern, 'fields[2]', {name: '_source', type: 'string'});

    addMappingInfoToPatternFields(testPattern, testTemplate);
    expect(testPattern.fields[2]).to.have.property('type', '_source');
  });
});
