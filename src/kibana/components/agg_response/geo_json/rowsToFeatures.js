define(function (require) {
  var decodeGeoHash = require('utils/decode_geo_hash');
  var AggConfigResult = require('components/vis/_agg_config_result');
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

      var location = decodeGeoHash(geohash);
      var center = [
        location.longitude[2],
        location.latitude[2]
      ];

      var rectangle = [
        [location.longitude[0], location.latitude[0]],
        [location.longitude[1], location.latitude[0]],
        [location.longitude[1], location.latitude[1]],
        [location.longitude[0], location.latitude[1]]
      ];

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          geohash: geohash,
          value: unwrap(row[metricI]),
          aggConfigResult: getAcr(row[metricI]),
          center: center,
          rectangle: rectangle
        }
      });
    }, []);
  }

  return convertRowsToFeatures;
});
