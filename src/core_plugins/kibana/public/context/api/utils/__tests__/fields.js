import expect from 'expect.js';

import { addComputedFields } from 'plugins/kibana/context/api/utils/fields';


describe('context app', function () {
  describe('function addComputedFields', function () {
    it('should add the `script_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        scriptFields: {
          sourcefield1: {
            script: '_source.field1',
          },
        }
      });

      const query = addComputedFields({ getComputedFields }, {});
      expect(query).to.have.property('script_fields');
      expect(query.script_fields).to.eql(getComputedFields().scriptFields);
    });

    it('should add the `docvalue_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        docvalueFields: ['field1'],
      });

      const query = addComputedFields({ getComputedFields }, {});
      expect(query).to.have.property('docvalue_fields');
      expect(query.docvalue_fields).to.eql(getComputedFields().docvalueFields);
    });

    it('should add the `stored_fields` property defined in the given index pattern', function () {
      const getComputedFields = () => ({
        storedFields: ['field1'],
      });

      const query = addComputedFields({ getComputedFields }, {});
      expect(query).to.have.property('stored_fields');
      expect(query.stored_fields).to.eql(getComputedFields().storedFields);
    });

    it('should preserve other properties of the query', function () {
      const getComputedFields = () => ({});

      const query = addComputedFields({ getComputedFields }, { property1: 'value1' });
      expect(query).to.have.property('property1', 'value1');
    });
  });
});
