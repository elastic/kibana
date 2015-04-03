define(function (require) {
  return function AggTypeMetricPercentileRanksProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var valuesEditor = require('text!components/agg_types/controls/percentile_ranks.html');
    // required by the values editor
    require('components/agg_types/controls/number_list/number_list');

    var valueProps = {
      makeLabel: function () {
        return 'Percentile rank ' + this.key + ' of "' + this.fieldDisplayName() + '"';
      }
    };

    return new MetricAggType({
      name: 'percentile_ranks',
      title: 'Percentile Ranks',
      makeLabel: function (agg) {
        return 'Percentile ranks of ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'values',
          editor: valuesEditor,
          default: []
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);

        return agg.params.values.map(function (value) {
          return new ValueAggConfig(value);
        });
      },
      getValue: function (agg, bucket) {
        // values for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});
