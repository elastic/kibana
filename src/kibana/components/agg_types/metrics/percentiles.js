define(function (require) {
  return function AggTypeMetricPercentilesProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getValueAggConfig = Private(require('components/agg_types/metrics/_get_value_agg_config'));
    var ordinalSuffix = require('utils/ordinal_suffix');

    require('components/agg_types/controls/_percent_list');
    var percentEditor = require('text!components/agg_types/controls/percents.html');

    var valueProps = {
      makeLabel: function () {
        return ordinalSuffix(this.key) + ' percentile of ' + this.fieldDisplayName();
      }
    };

    return new MetricAggType({
      name: 'percentiles',
      title: 'Percentiles',
      makeLabel: function (agg) {
        return 'Percentiles of ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'percents',
          editor: percentEditor,
          default: [1, 5, 25, 50, 75, 95, 99]
        }
      ],
      getResponseValueAggs: function (agg) {
        var ValueAggConfig = getValueAggConfig(agg, valueProps);

        return agg.params.percents.map(function (percent) {
          return new ValueAggConfig(percent);
        });
      },
      getValue: function (agg, bucket) {
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});