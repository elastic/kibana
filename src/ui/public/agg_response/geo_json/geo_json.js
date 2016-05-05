import _ from 'lodash';
import rowsToFeatures from 'ui/agg_response/geo_json/rows_to_features';
import AggResponseGeoJsonTooltipFormatterProvider from 'ui/agg_response/geo_json/_tooltip_formatter';
export default function TileMapConverterFn(Private, timefilter, $compile, $rootScope) {

  let tooltipFormatter = Private(AggResponseGeoJsonTooltipFormatterProvider);

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
          zoom: geoAgg && geoAgg.vis.uiStateVal('mapZoom'),
          center: geoAgg && geoAgg.vis.uiStateVal('mapCenter')
        }
      }
    };
  };
};
