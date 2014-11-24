define(function (require) {
  return function GeoHashAggDefinition(Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var AggType = Private(require('components/agg_types/_agg_type'));

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
          default: 3,
          editor: require('text!components/agg_types/controls/precision.html'),
          write: function (aggConfig, output) {
            var precision = parseInt(aggConfig.params.precision, 10);
            if (isNaN(precision)) {
              precision = 3;
            }
            output.params.precision = precision;
          }
        }
      ]
    });
  };
});