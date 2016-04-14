define(function (require) {
  return function TileMapConverterFn(Private, timefilter, $compile, $rootScope) {
    let _ = require('lodash');

    let rowsToFeatures = require('ui/agg_response/geo_json/rowsToFeatures');
    let tooltipFormatter = Private(require('ui/agg_response/geo_json/_tooltip_formatter'));

    return function (vis, table) {

      function columnIndex(schema) {
        return _.findIndex(table.columns, function (col) {
          return col.aggConfig.schema.name === schema;
        });
      }

      let geoI = columnIndex('segment');
      let metricI = columnIndex('metric');
      let geoAgg = _.get(table.columns, [geoI, 'aggConfig']);
      let metricAgg = _.get(table.columns, [metricI, 'aggConfig']);

      let features = rowsToFeatures(table, geoI, metricI);
      let values = features.map(function (feature) {
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
            zoom: _.get(geoAgg, 'params.mapZoom'),
            center: _.get(geoAgg, 'params.mapCenter')
          }
        }
      };
    };
  };
});
