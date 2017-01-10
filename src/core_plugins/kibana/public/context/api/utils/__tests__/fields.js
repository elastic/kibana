import { expect } from 'chai';

import { addComputedFields } from 'plugins/kibana/context/api/utils/fields';


describe('context app', function () {
  describe('addComputedFields', function () {
    it('should add the `script_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        scriptFields: {
          sourcefield1: {
            script: '_source.field1',
          },
        }
      });

      expect(addComputedFields({ getComputedFields }, {})).to.have.property('script_fields')
        .that.is.deep.equal(getComputedFields().scriptFields);
    });

    it('should add the `docvalue_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        docvalueFields: ['field1'],
      });

      expect(addComputedFields({ getComputedFields }, {})).to.have.property('docvalue_fields')
        .that.is.deep.equal(getComputedFields().docvalueFields);
    });

    it('should add the `stored_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        storedFields: ['field1'],
      });

      expect(addComputedFields({ getComputedFields }, {})).to.have.property('stored_fields')
        .that.is.deep.equal(getComputedFields().storedFields);
    });
  });
});
