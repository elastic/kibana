define(function (require) {
  return function AggTypeMetricScriptedMetricProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    var fieldFormats = Private(require('ui/registry/field_formats'));

    var stringEditor = require('ui/agg_types/controls/string.html');

    return new MetricAggType({
      name: 'scripted_metric',
      title: 'Scripted Metric',
      makeLabel: function (/*aggConfig*/) {
        return 'Scripted Metric';
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('number') || fieldFormats.getDefaultInstance('percent');
      },
      supportsOrderBy: false,
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