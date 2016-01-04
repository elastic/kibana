const createMappingFromPatternField = require('../create_mapping_from_pattern_field');
const expect = require('expect.js');
const _ = require('lodash');

let testField;

describe('createMappingFromPatternField', function () {

  beforeEach(function () {
    testField = {
      'name': 'ip',
      'type': 'ip',
      'count': 2,
      'scripted': false
    };
  });

  it('should throw an error if the argument is empty', function () {
    expect(createMappingFromPatternField).to.throwException(/argument must not be empty/);
  });

  it('should not modify the original argument', function () {
    const testFieldClone = _.cloneDeep(testField);
    const mapping = createMappingFromPatternField(testField);

    expect(mapping).to.not.be(testField);
    expect(_.isEqual(testField, testFieldClone)).to.be.ok();
  });

  it('should remove kibana properties that are not valid for ES field mappings', function () {
    const mapping = createMappingFromPatternField(testField);
    expect(mapping).to.not.have.property('name');
    expect(mapping).to.not.have.property('count');
    expect(mapping).to.not.have.property('scripted');
    expect(mapping).to.not.have.property('indexed');
    expect(mapping).to.not.have.property('analyzed');
  });

  it('should set doc_values and indexed status based on the relevant kibana properties if they exist', function () {
    testField.indexed = true;
    testField.analyzed = false;
    testField.doc_values = true;
    let mapping = createMappingFromPatternField(testField);

    expect(mapping).to.have.property('doc_values', true);
    expect(mapping).to.have.property('index', 'not_analyzed');

    testField.analyzed = true;
    mapping = createMappingFromPatternField(testField);
    expect(mapping).to.have.property('index', 'analyzed');
  });
});
