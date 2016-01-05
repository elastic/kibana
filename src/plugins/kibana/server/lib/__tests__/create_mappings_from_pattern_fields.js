const createMappingsFromPatternFields = require('../create_mappings_from_pattern_fields');
const expect = require('expect.js');
const _ = require('lodash');

let testFields;

describe('createMappingsFromPatternFields', function () {

  beforeEach(function () {
    testFields = [
      {
        'name': 'ip',
        'type': 'ip',
        'count': 2,
        'scripted': false
      },
      {
        'name': 'geo.coordinates',
        'type': 'geo_point',
        'count': 0,
        'scripted': false
      }
    ];
  });

  it('should throw an error if the argument is empty', function () {
    expect(createMappingsFromPatternFields).to.throwException(/argument must not be empty/);
  });

  it('should not modify the original argument', function () {
    const testFieldClone = _.cloneDeep(testFields);
    const mappings = createMappingsFromPatternFields(testFields);

    expect(mappings.ip).to.not.be(testFields[0]);
    expect(_.isEqual(testFields, testFieldClone)).to.be.ok();
  });

  it('should remove kibana properties that are not valid for ES field mappings', function () {
    const mappings = createMappingsFromPatternFields(testFields);
    expect(mappings.ip).to.not.have.property('name');
    expect(mappings.ip).to.not.have.property('count');
    expect(mappings.ip).to.not.have.property('scripted');
    expect(mappings.ip).to.not.have.property('indexed');
    expect(mappings.ip).to.not.have.property('analyzed');
  });

  it('should set doc_values and indexed status based on the relevant kibana properties if they exist', function () {
    testFields[0].indexed = true;
    testFields[0].analyzed = false;
    testFields[0].doc_values = true;
    let mappings = createMappingsFromPatternFields(testFields);

    expect(mappings.ip).to.have.property('doc_values', true);
    expect(mappings.ip).to.have.property('index', 'not_analyzed');

    testFields[0].analyzed = true;
    mappings = createMappingsFromPatternFields(testFields);
    expect(mappings.ip).to.have.property('index', 'analyzed');
  });

  it('should handle nested fields', function () {
    let mappings = createMappingsFromPatternFields(testFields);

    expect(mappings).to.have.property('geo');
    expect(mappings.geo).to.have.property('properties');
    expect(mappings.geo.properties).to.have.property('coordinates');
    expect(_.isEqual(mappings.geo.properties.coordinates, {type: 'geo_point'}));
  });
});
