define(function (require) {
  return function AggTypeMetricPercentilesProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));
    var ordinalSuffix = require('utils/ordinal_suffix');
    var fieldFormats = Private(require('registry/field_formats'));

    var percentsEditor = require('text!components/agg_types/controls/percentiles.html');
    // required by the percentiles editor
    require('components/number_list/number_list');

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
          editor: percentsEditor,
          default: [1, 5, 25, 50, 75, 95, 99]
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);

        return agg.params.percents.map(function (percent) {
          return new ValueAggConfig(percent);
        });
      },
      getValue: function (agg, bucket) {
        // percentiles for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});
