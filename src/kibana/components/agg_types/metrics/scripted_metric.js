define(function (require) {
  return function AggTypeMetricScriptedMetricProvider(Private) {
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var fieldFormats = Private(require('registry/field_formats'));

    var stringEditor = require('text!components/agg_types/controls/string.html');

    return new MetricAggType({
      name: 'scripted_metric',
      title: 'Scripted Metric',
      makeLabel: function (aggConfig) {
        return 'Scripted Metric';
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('number') || fieldFormats.getDefaultInstance('percent');
      },
      getResponseAggs: function (agg) {
        return [];
      },
      params: [
        {
          name: 'init_script',
          editor: stringEditor,
          default: ''
        }, {
          name: 'map_script',
          editor: stringEditor,
          default: ''
        }, {
          name: 'combine_script',
          editor: stringEditor,
          default: ''
        }, {
          name: 'reduce_script',
          editor: stringEditor,
          default: ''
        }
      ]
    });
  };
});
