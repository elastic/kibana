import forEachField from '../lib/for_each_field';
import sinon from 'auto-release-sinon';
import expect from 'expect.js';

describe('forEachField', function () {

  let testDoc;

  beforeEach(function () {
    testDoc = {
      foo: [
        {bar: [{'baz': 1}]},
        {bat: 'boo'}
      ]
    };
  });

  it('should require a plain object argument', function () {
    expect(forEachField).withArgs([], () => {}).to.throwException(/first argument must be a plain object/);
  });

  it('should not invoke iteratee if collection is null or empty', function () {
    const iteratee = sinon.spy();

    forEachField({}, iteratee);

    expect(iteratee.called).to.not.be.ok();
  });

  it('should call iteratee for each item in an array field, but not for the array itself', function () {
    const iteratee = sinon.spy();

    forEachField({foo: [1, 2, 3]}, iteratee);

    expect(iteratee.callCount).to.be(3);
    expect(iteratee.calledWith(1, 'foo')).to.be.ok();
    expect(iteratee.calledWith(2, 'foo')).to.be.ok();
    expect(iteratee.calledWith(3, 'foo')).to.be.ok();
  });

  it('should call iteratee for flattened inner object properties, as well as the object itself', function () {
    const iteratee = sinon.spy();

    forEachField(testDoc, iteratee);

    expect(iteratee.callCount).to.be(5);
    expect(iteratee.calledWith(testDoc.foo[0], 'foo')).to.be.ok();
    expect(iteratee.calledWith(testDoc.foo[1], 'foo')).to.be.ok();
    expect(iteratee.calledWith(testDoc.foo[0].bar[0], 'foo.bar')).to.be.ok();
    expect(iteratee.calledWith(1, 'foo.bar.baz')).to.be.ok();
    expect(iteratee.calledWith('boo', 'foo.bat')).to.be.ok();
  });

  it('should detect geo_point fields and should not invoke iteratee for its lat and lon sub properties', function () {
    const iteratee = sinon.spy();
    const geo = {lat: 38.6631, lon: -90.5771};

    forEachField({ geo }, iteratee);

    expect(iteratee.callCount).to.be(1);
    expect(iteratee.calledWith(geo, 'geo')).to.be.ok();
  });

});
