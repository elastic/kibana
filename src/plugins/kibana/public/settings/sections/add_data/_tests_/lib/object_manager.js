var expect = require('expect.js');
var sinon = require('sinon');

var objectManager = require('../../lib/object_manager');

describe('object manager', function() {

  describe('mutateClone', function() {

    it('modify the object to have the structure and values of sourceObject.', function () {
      let object = {
        oldProperty: 'oldValue',
        property3: 'oldvalue3',
        property4: {
          subpro1: 'value1',
          subpro2: 'value2'
        }
      };
      let sourceObject = {
        property1: 'value1',
        property2: 'value2'
      };
      let objectPointer = object;

      objectManager.mutateClone(object, sourceObject);

      expect(object).to.eql(sourceObject);
      expect(object).to.equal(objectPointer);
    });

    it('modify the object to have the structure and values of sourceObject.', function () {
      let object = {
        oldProperty: 'oldValue',
        property3: 'oldvalue3',
        property4: {
          subpro1: 'value1',
          subpro2: 'value2'
        }
      };
      let sourceObject = {
        property1: 'value1',
        property2: 'value2',
        property4: {
          subpro3: 'value3'
        }
      };
      let objectPointer = object;

      objectManager.mutateClone(object, sourceObject);

      console.log('object', object);
      console.log('sourceObject', sourceObject);

      expect(object).to.eql(sourceObject);
      expect(object).to.equal(objectPointer);
    });

  });

});
