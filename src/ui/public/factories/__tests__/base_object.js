import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/private';

import { BaseObject } from 'ui/utils/base_object';

describe('Base Object', function () {
  beforeEach(ngMock.module('kibana'));

  it('should take an inital set of values', function () {
    const baseObject = new BaseObject({ message: 'test' });
    expect(baseObject).to.have.property('message', 'test');
  });

  it('should serialize _attributes to RISON', function () {
    const baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    const rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should not serialize $$attributes to RISON', function () {
    const baseObject = new BaseObject();
    baseObject.$$attributes = { foo: 'bar' };
    baseObject.message = 'Testing... 1234';
    const rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should serialize _attributes for JSON', function () {
    const baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    baseObject._private = 'foo';
    baseObject.$private = 'stuff';
    const json = JSON.stringify(baseObject);
    expect(json).to.equal('{"message":"Testing... 1234"}');
  });
});
