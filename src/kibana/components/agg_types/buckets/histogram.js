define(function (require) {
  return function HistogramAggDefinition(Private) {
    var _ = require('lodash');
    var moment = require('moment');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/histogram'));

    return new AggType({
      name: 'histogram',
      title: 'Histogram',
      ordered: {},
      makeLabel: function (aggConfig) {
        return aggConfig.params.field.displayName;
      },
      createFilter: createFilter,
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },

        {
          name: 'interval',
          editor: require('text!components/agg_types/controls/interval.html'),
          write: function (aggConfig, output) {
            output.params.interval = parseInt(aggConfig.params.interval, 10);
          }
        },

        {
          name: 'min_doc_count',
          default: null,
          editor: require('text!components/agg_types/controls/min_doc_count.html'),
          write: function (aggConfig, output) {
            if (aggConfig.params.min_doc_count) {
              output.params.min_doc_count = 0;
            }
          }
        },

        {
          name: 'extended_bounds',
          default: {},
          editor: require('text!components/agg_types/controls/extended_bounds.html'),
          write: function (aggConfig, output) {
            var val = aggConfig.params.extended_bounds;

            if (val.min != null || val.max != null) {
              output.params.extended_bounds = {
                min: val.min,
                max: val.max
              };
            }
          },

          // called from the editor
          shouldShow: function (aggConfig) {
            var field = aggConfig.params.field;
            if (
              field
              && (field.type === 'number' || field.type === 'date')
            ) {
              return true;
            }
          }
        }
      ]
    });
  };
});
