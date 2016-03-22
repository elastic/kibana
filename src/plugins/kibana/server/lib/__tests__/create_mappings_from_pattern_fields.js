import createMappingsFromPatternFields from '../create_mappings_from_pattern_fields';
import expect from 'expect.js';
import _ from 'lodash';

let testFields;

describe('createMappingsFromPatternFields', function () {

  beforeEach(function () {
    testFields = [
      {
        'name': 'ip',
        'type': 'ip'
      },
      {
        'name': 'agent',
        'type': 'string'
      },
      {
        'name': 'bytes',
        'type': 'number'
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

  it('should set the same default mapping for all non-strings', function () {
    let mappings = createMappingsFromPatternFields(testFields);

    _.forEach(mappings, function (mapping) {
      if (mapping.type !== 'text') {
        expect(_.isEqual(mapping, {
          type: mapping.type,
          index: true,
          doc_values: true
        })).to.be.ok();
      }
    });
  });

  it('should give strings a multi-field mapping with a "text" base type', function () {
    let mappings = createMappingsFromPatternFields(testFields);

    _.forEach(mappings, function (mapping) {
      if (mapping.type === 'text') {
        expect(mapping).to.have.property('fields');
      }
    });
  });

  it('should handle nested fields', function () {
    testFields.push({name: 'geo.coordinates', type: 'geo_point'});
    let mappings = createMappingsFromPatternFields(testFields);

    expect(mappings).to.have.property('geo');
    expect(mappings.geo).to.have.property('properties');
    expect(mappings.geo.properties).to.have.property('coordinates');
    expect(_.isEqual(mappings.geo.properties.coordinates, {
      type: 'geo_point',
      index: true,
      doc_values: true
    })).to.be.ok();
  });

  it('should map all number fields as an ES double', function () {
    let mappings = createMappingsFromPatternFields(testFields);

    expect(mappings).to.have.property('bytes');
    expect(mappings.bytes).to.have.property('type', 'double');
  });
});
