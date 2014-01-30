// geohash.js
// Geohash library for Javascript
// (c) 2008 David Troy
// Distributed under the MIT License
// https://github.com/davetroy/geohash-js
//
// Adapted by Jeroen van Wilgenburg for use with requirejs and Kibana (removed encodeGeoHash and added var in required places)


define(function () {
  "use strict";

  var BITS = [16, 8, 4, 2, 1];
  var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  function refine_interval(interval, cd, mask) {
    if (cd & mask) {
      interval[0] = (interval[0] + interval[1]) / 2;
    } else {
      interval[1] = (interval[0] + interval[1]) / 2;
    }
  }

  function decodeGeoHash(geohash) {
    var is_even = 1;
    var lat = [];
    var lon = [];
    lat[0] = -90.0;
    lat[1] = 90.0;
    lon[0] = -180.0;
    lon[1] = 180.0;
    var lat_err = 90.0;
    var lon_err = 180.0;

    for (var i = 0; i < geohash.length; i++) {
      var c = geohash[i];
      var cd = BASE32.indexOf(c);
      for (var j = 0; j < 5; j++) {
        var mask = BITS[j];
        if (is_even) {
          lon_err /= 2;
          refine_interval(lon, cd, mask);
        } else {
          lat_err /= 2;
          refine_interval(lat, cd, mask);
        }
        is_even = !is_even;
      }
    }
    lat[2] = (lat[0] + lat[1]) / 2;
    lon[2] = (lon[0] + lon[1]) / 2;

    return { latitude: lat, longitude: lon};
  }


  return {
    decodeGeoHash: decodeGeoHash
  };

});