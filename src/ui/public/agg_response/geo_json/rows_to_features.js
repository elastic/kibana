import { decodeGeoHash } from 'ui/utils/decode_geo_hash';
import AggConfigResult from 'ui/vis/agg_config_result';
import _ from 'lodash';

function getAcr(val) {
  return val instanceof AggConfigResult ? val : null;
}

function unwrap(val) {
  return getAcr(val) ? val.value : val;
}

export function convertRowsToFeatures(table, geoI, metricI, centroidI) {

  return _.transform(table.rows, function (features, row) {
    const geohash = unwrap(row[geoI]);
    if (!geohash) return;

    // fetch latLn of northwest and southeast corners, and center point
    const location = decodeGeoHash(geohash);

    const centerLatLng = [
      location.latitude[2],
      location.longitude[2]
    ];

    //courtsey of @JacobBrandt: https://github.com/elastic/kibana/pull/9676/files#diff-c7c9f237e673ff486654f6cc6caa89f6
    let point = centerLatLng;
    const centroid = unwrap(row[centroidI]);
    if (centroid) {
      point = [
        centroid.lat,
        centroid.lon
      ];
    }

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
        coordinates: point.slice(0).reverse()
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
