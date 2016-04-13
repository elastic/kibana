let angular = require('angular');
let _ = require('lodash');
let sinon = require('sinon');
let expect = require('expect.js');
let ngMock = require('ngMock');
require('ui/private');

describe('Base Object', function () {
  let $rootScope;
  let BaseObject;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    $rootScope = _$rootScope_;
    BaseObject = require('ui/utils/BaseObject');
  }));

  it('should take an inital set of values', function () {
    let baseObject = new BaseObject({ message: 'test' });
    expect(baseObject).to.have.property('message', 'test');
  });

  it('should serialize _attributes to RISON', function () {
    let baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    let rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should not serialize $$attributes to RISON', function () {
    let baseObject = new BaseObject();
    baseObject.$$attributes = { foo: 'bar' };
    baseObject.message = 'Testing... 1234';
    let rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should serialize _attributes for JSON', function () {
    let baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    baseObject._private = 'foo';
    baseObject.$private = 'stuff';
    let json = JSON.stringify(baseObject);
    expect(json).to.equal('{"message":"Testing... 1234"}');
  });

});
