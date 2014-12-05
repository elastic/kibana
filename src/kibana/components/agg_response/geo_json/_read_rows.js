define(function (require) {
  var decodeGeoHash = require('utils/decode_geo_hash');

  function readRows(table, agg, index, chart) {
    var geoJson = chart.geoJson;
    var props = geoJson.properties;
    var metricLabel = agg.metric.makeLabel();
    props.length = table.rows.length;
    props.min = null;
    props.max = null;

    table.rows.forEach(function (row) {
      var geohash = row[index.geo].value;
      var valResult = row[index.metric];
      var val = valResult.value;

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