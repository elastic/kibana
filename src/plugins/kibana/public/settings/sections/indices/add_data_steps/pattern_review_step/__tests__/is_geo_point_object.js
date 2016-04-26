import isGeoPointObject from '../lib/is_geo_point_object';
import expect from 'expect.js';

describe('isGeoPointObject', function () {

  it('should return true if an object has lat and lon properties', function () {
    expect(isGeoPointObject({lat: 38.6631, lon: -90.5771})).to.be.ok();
  });

  it('should return false if the value is not an object', function () {
    expect(isGeoPointObject('foo')).to.not.be.ok();
    expect(isGeoPointObject(1)).to.not.be.ok();
    expect(isGeoPointObject(true)).to.not.be.ok();
    expect(isGeoPointObject(null)).to.not.be.ok();
  });

  it('should return false if the value is an object without lat an lon properties', function () {
    expect(isGeoPointObject({foo: 'bar'})).to.not.be.ok();
  });

});
