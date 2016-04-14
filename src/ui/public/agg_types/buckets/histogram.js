define(function (require) {
  return function HistogramAggDefinition(Private) {
    let _ = require('lodash');
    let moment = require('moment');
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/histogram'));

    require('ui/validateDateInterval');

    return new BucketAggType({
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
          editor: require('ui/agg_types/controls/interval.html'),
          write: function (aggConfig, output) {
            output.params.interval = parseInt(aggConfig.params.interval, 10);
          }
        },

        {
          name: 'min_doc_count',
          default: null,
          editor: require('ui/agg_types/controls/min_doc_count.html'),
          write: function (aggConfig, output) {
            if (aggConfig.params.min_doc_count) {
              output.params.min_doc_count = 0;
            }
          }
        },

        {
          name: 'extended_bounds',
          default: {},
          editor: require('ui/agg_types/controls/extended_bounds.html'),
          write: function (aggConfig, output) {
            let val = aggConfig.params.extended_bounds;

            if (val.min != null || val.max != null) {
              output.params.extended_bounds = {
                min: val.min,
                max: val.max
              };
            }
          },

          // called from the editor
          shouldShow: function (aggConfig) {
            let field = aggConfig.params.field;
            if (
              field
              && (field.type === 'number' || field.type === 'date')
            ) {
              return aggConfig.params.min_doc_count;
            }
          }
        }
      ]
    });
  };
});
