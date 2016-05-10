import isGeoPointObject from '../lib/is_geo_point_object';
import expect from 'expect.js';

describe('isGeoPointObject', function () {

  it('should return true if an object has lat and lon properties', function () {
    expect(isGeoPointObject({lat: 38.6631, lon: -90.5771})).to.be(true);
  });

  it('should return false if the value is not an object', function () {
    expect(isGeoPointObject('foo')).to.be(false);
    expect(isGeoPointObject(1)).to.be(false);
    expect(isGeoPointObject(true)).to.be(false);
    expect(isGeoPointObject(null)).to.be(false);
  });

  it('should return false if the value is an object without lat an lon properties', function () {
    expect(isGeoPointObject({foo: 'bar'})).to.be(false);
  });

});
