define(function (require) {
  return function GeoHashAggDefinition(Private, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var defaultPrecision = 3;

    function getPrecision(precision) {
      var maxPrecision = _.parseInt(config.get('visualization:tileMap:maxPrecision'));

      precision = parseInt(precision, 10);

      if (isNaN(precision)) {
        precision = defaultPrecision;
      }

      if (precision > maxPrecision) {
        return maxPrecision;
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