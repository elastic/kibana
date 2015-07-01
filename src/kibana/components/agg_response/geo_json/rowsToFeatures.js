define(function (require) {
  var decodeGeoHash = require('utils/decode_geo_hash');
  var AggConfigResult = require('components/vis/AggConfigResult');
  var _ = require('lodash');

  function getAcr(val) {
    return val instanceof AggConfigResult ? val : null;
  }

  function unwrap(val) {
    return getAcr(val) ? val.value : val;
  }

  function convertRowsToFeatures(table, geoI, metricI) {
    return _.transform(table.rows, function (features, row) {
      var geohash = unwrap(row[geoI]);
      if (!geohash) return;

      // fetch latLn of northwest and southeast corners, and center point
      var location = decodeGeoHash(geohash);

      var centerLatLng = [
        location.latitude[2],
        location.longitude[2]
      ];

      // geoJson coords use LngLat coordinates
      // http://geojson.org/geojson-spec.html#positions
      // "longitude, latitude, altitude for coordinates in a geographic coordinate reference system"
      var centerLngLat = [
        location.longitude[2],
        location.latitude[2]
      ];

      // order is nw, ne, se, sw
      var rectangle = [
        [location.latitude[0], location.longitude[0]],
        [location.latitude[0], location.longitude[1]],
        [location.latitude[1], location.longitude[1]],
        [location.latitude[1], location.longitude[0]],
      ];


      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: centerLngLat
        },
        properties: {
          geohash: geohash,
          value: unwrap(row[metricI]),
          aggConfigResult: getAcr(row[metricI]),
          center: centerLatLng,
          rectangle: rectangle
        }
      });
    }, []);
  }

  return convertRowsToFeatures;
});
