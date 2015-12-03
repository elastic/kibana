const expect = require('expect.js');
const _ = require('lodash');
const removeDeprecatedFieldProps = require('../remove_deprecated_field_props');
const indexPattern = require('../../../../../fixtures/index_pattern_with_mappings.json');

indexPattern.fields[0].type = 'geo_point';
indexPattern.fields[0].indexed = true;
indexPattern.fields[0].analyzed = false;
indexPattern.fields[0].doc_values = false;

indexPattern.fields[1].type = 'ip';
indexPattern.fields[1].indexed = true;
indexPattern.fields[1].analyzed = false;
indexPattern.fields[1].doc_values = true;

describe('removeDeprecatedFieldProps', function () {

  it('should remove properties from old index patterns that are now included in the field mappings', function () {
    const result = removeDeprecatedFieldProps(indexPattern);
    expect(result.fields[0]).not.to.have.property('type');
    expect(result.fields[0]).not.to.have.property('indxed');
    expect(result.fields[0]).not.to.have.property('analyzed');
    expect(result.fields[0]).not.to.have.property('doc_values');
    expect(result.fields[1]).not.to.have.property('type');
    expect(result.fields[1]).not.to.have.property('indxed');
    expect(result.fields[1]).not.to.have.property('analyzed');
    expect(result.fields[1]).not.to.have.property('doc_values');
  });

  it('should accept an array of index patterns', function () {
    const indexPatternNumeroDos = _.cloneDeep(indexPattern);
    const result = removeDeprecatedFieldProps([indexPattern, indexPatternNumeroDos]);

    expect(result).to.be.an('array');
    expect(result[0].fields[0]).not.to.have.property('type');
    expect(result[0].fields[0]).not.to.have.property('indxed');
    expect(result[0].fields[0]).not.to.have.property('analyzed');
    expect(result[0].fields[0]).not.to.have.property('doc_values');
    expect(result[0].fields[1]).not.to.have.property('type');
    expect(result[0].fields[1]).not.to.have.property('indxed');
    expect(result[0].fields[1]).not.to.have.property('analyzed');
    expect(result[0].fields[1]).not.to.have.property('doc_values');

    expect(result[1].fields[0]).not.to.have.property('type');
    expect(result[1].fields[0]).not.to.have.property('indxed');
    expect(result[1].fields[0]).not.to.have.property('analyzed');
    expect(result[1].fields[0]).not.to.have.property('doc_values');
    expect(result[1].fields[1]).not.to.have.property('type');
    expect(result[1].fields[1]).not.to.have.property('indxed');
    expect(result[1].fields[1]).not.to.have.property('analyzed');
    expect(result[1].fields[1]).not.to.have.property('doc_values');
  });

});

