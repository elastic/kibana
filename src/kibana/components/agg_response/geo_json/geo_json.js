define(function (require) {
  return function TileMapConverterFn(Private, timefilter, $compile, $rootScope) {
    var _ = require('lodash');

    var rowsToFeatures = require('components/agg_response/geo_json/rowsToFeatures');
    var tooltipFormatter = Private(require('components/agg_response/geo_json/_tooltip_formatter'));

    return function (vis, table) {

      function columnIndex(schema) {
        return _.findIndex(table.columns, function (col) {
          return col.aggConfig.schema.name === schema;
        });
      }

      var geoI = columnIndex('segment');
      var metricI = columnIndex('metric');
      var geoAgg = _.get(table.columns, [geoI, 'aggConfig']);
      var metricAgg = _.get(table.columns, [metricI, 'aggConfig']);

      var features = rowsToFeatures(table, geoI, metricI);
      var values = features.map(function (feature) {
        return feature.properties.value;
      });

      return {
        title: table.title(),
        valueFormatter: metricAgg && metricAgg.fieldFormatter(),
        tooltipFormatter: tooltipFormatter,
        geohashGridAgg: geoAgg,
        geoJson: {
          type: 'FeatureCollection',
          features: features,
          properties: {
            min: _.min(values),
            max: _.max(values),
            zoom: _.deepGet(geoAgg, 'params.mapZoom'),
            center: _.deepGet(geoAgg, 'params.mapCenter')
          }
        }
      };
    };
  };
});
