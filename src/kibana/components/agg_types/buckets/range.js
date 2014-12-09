define(function (require) {
  return function RangeAggDefinition(Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/range'));

    return new AggType({
      name: 'range',
      title: 'Range',
      createFilter: createFilter,
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName + ' ranges';
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: ['number']
        },
        {
          name: 'ranges',
          default: [
            { from: 0, to: 1000 },
            { from: 1000, to: 2000 }
          ],
          editor: require('text!components/agg_types/controls/ranges.html'),
          write: function (aggConfig, output) {
            output.params.ranges = aggConfig.params.ranges;
            output.params.keyed = true;
          }
        }
      ]
    });
  };
});
