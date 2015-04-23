define(function (require) {
  return function AggTypeMetricCountProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var fieldFormats = Private(require('registry/field_formats'));

    _(CountFormat).inherits(Private(require('components/index_patterns/_field_format')));
    function CountFormat() {
      this._convert = function (val) {
        return (val || 0) + ' hits';
      };
      CountFormat.Super.call(this);
    }

    return new MetricAggType({
      name: 'count',
      title: 'Count',
      hasNoDsl: true,
      makeLabel: function () {
        return 'Count';
      },
      getValue: function (agg, bucket) {
        return bucket.doc_count;
      },
      getFormat: _.constant(new CountFormat())
    });
  };
});
