var expect = require('expect.js');
var sinon = require('sinon');

var keysDeep = require('../keys_deep');

describe('keys deep', function () {

  it('should list first level properties', function () {
    let object = {
      property1: 'value1',
      property2: 'value2'
    };
    let expected = [
      'property1',
      'property2'
    ];

    const keys = keysDeep(object);

    expect(keys).to.eql(expected);
  });

  it('should list nested properties', function () {
    let object = {
      property1: 'value1',
      property2: 'value2',
      property3: {
        subProperty1: 'value1.1'
      }
    };
    let expected = [
      'property1',
      'property2',
      'property3.subProperty1',
      'property3'
    ];

    const keys = keysDeep(object);

    expect(keys).to.eql(expected);
  });


  it('should list nested properties 2', function () {
    let object = {
      property1: 'value1',
      property2: 'value2',
      property3: {
        subProperty1: 'value1.1',
        subProperty2: {
          prop1: 'value1.2.1',
          prop2: 'value2.2.2'
        },
        subProperty3: 'value1.3'
      }
    };
    let expected = [
      'property1',
      'property2',
      'property3.subProperty1',
      'property3.subProperty2.prop1',
      'property3.subProperty2.prop2',
      'property3.subProperty2',
      'property3.subProperty3',
      'property3'
    ];

    const keys = keysDeep(object);

    expect(keys).to.eql(expected);
  });

});
