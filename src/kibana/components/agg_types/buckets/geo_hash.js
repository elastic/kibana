define(function (require) {
  return function GeoHashAggDefinition(Private, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var defaultPrecision = 3;

    function getPrecision(precision) {
      precision = parseInt(precision, 10);

      if (isNaN(precision)) {
        precision = defaultPrecision;
      }

      if (precision > config.get('visualization:tileMap:maxPrecision')) {
        return parseInt(config.get('visualization:tileMap:maxPrecision'), 10);
      }

      return precision;
    }

    return new AggType({
      name: 'geohash_grid',
      title: 'Geohash',
      ordered: {},
      params: [
        {
          name: 'field',
          filterFieldTypes: 'geo_point'
        },
        {
          name: 'precision',
          default: defaultPrecision,
          editor: require('text!components/agg_types/controls/precision.html'),
          deserialize: getPrecision,
          write: function (aggConfig, output) {
            output.params.precision = getPrecision(aggConfig.params.precision);
          }
        }
      ]
    });
  };
});