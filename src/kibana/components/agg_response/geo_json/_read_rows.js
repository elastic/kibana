define(function (require) {
  var decodeGeoHash = require('utils/decode_geo_hash');
  var AggConfigResult = require('components/vis/_agg_config_result');
  var _ = require('lodash');

  function unwrap(val) {
    return (val instanceof AggConfigResult) ? val.value : val;
  }

  function readRows(table, agg, index, chart) {
    var geoJson = chart.geoJson;
    var props = geoJson.properties;
    var metricLabel = agg.metric.makeLabel();
    var metricFormatter = agg.metric.fieldFormatter();

    props.length = table.rows.length;
    props.min = null;
    props.max = null;
    props.agg = agg;
    props.valueFormatter = metricFormatter;

    table.rows.forEach(function (row) {
      var geohash = unwrap(row[index.geo]);
      var valResult = (row[index.metric] instanceof AggConfigResult) ? row[index.metric] : null;
      var val = unwrap(row[index.metric]);
      var formatted = metricFormatter(val);

      if (props.min === null || val < props.min) props.min = val;
      if (props.max === null || val > props.max) props.max = val;

      var location = decodeGeoHash(geohash);
      var center = [location.longitude[2], location.latitude[2]];
      var rectangle = [
        [location.longitude[0], location.latitude[0]],
        [location.longitude[1], location.latitude[0]],
        [location.longitude[1], location.latitude[1]],
        [location.longitude[0], location.latitude[1]]
      ];

      geoJson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center
        },
        properties: {
          valueLabel: metricLabel,
          valueFormatted: formatted,
          count: val,
          geohash: geohash,
          center: center,
          aggConfigResult: valResult,
          rectangle: rectangle
        }
      });

    });
  }

  return readRows;
});
