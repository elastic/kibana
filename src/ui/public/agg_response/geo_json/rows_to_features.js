import decodeGeoHash from 'ui/utils/decode_geo_hash';
import AggConfigResult from 'ui/vis/agg_config_result';
import _ from 'lodash';

function getAcr(val) {
  return val instanceof AggConfigResult ? val : null;
}

function unwrap(val) {
  return getAcr(val) ? val.value : val;
}

function convertRowsToFeatures(table, geoI, metricI) {
  return _.transform(table.rows, function (features, row) {
    const geohash = unwrap(row[geoI]);
    if (!geohash) return;

    // fetch latLn of northwest and southeast corners, and center point
    const location = decodeGeoHash(geohash);

    const centerLatLng = [
      location.latitude[2],
      location.longitude[2]
    ];

    // order is nw, ne, se, sw
    const rectangle = [
      [location.latitude[0], location.longitude[0]],
      [location.latitude[0], location.longitude[1]],
      [location.latitude[1], location.longitude[1]],
      [location.latitude[1], location.longitude[0]],
    ];

    // geoJson coords use LngLat, so we reverse the centerLatLng
    // See here for details: http://geojson.org/geojson-spec.html#positions
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: centerLatLng.slice(0).reverse()
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

export default convertRowsToFeatures;
