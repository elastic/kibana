import _ from 'lodash';
import { convertRowsToFeatures } from 'ui/agg_response/geo_json/rows_to_features';
import { TileMapTooltipFormatterProvider } from 'ui/agg_response/geo_json/_tooltip_formatter';

export function AggResponseGeoJsonProvider(Private) {

  const tooltipFormatter = Private(TileMapTooltipFormatterProvider);

  return function (vis, table) {

    function columnIndex(schema) {
      return _.findIndex(table.columns, function (col) {
        return col.aggConfig.schema.name === schema;
      });
    }

    const geoI = columnIndex('segment');
    const metricI = columnIndex('metric');
    const centroidI = _.findIndex(table.columns, (col) => col.aggConfig.type.name === 'geo_centroid');

    const geoAgg = _.get(table.columns, [geoI, 'aggConfig']);
    const metricAgg = _.get(table.columns, [metricI, 'aggConfig']);

    const features = convertRowsToFeatures(table, geoI, metricI, centroidI);
    const values = features.map(function (feature) {
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
}
