define(function (require) {
  return function AggTypeMetricPercentileRanksProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));
    var fieldFormats = Private(require('registry/field_formats'));

    var valuesEditor = require('text!components/agg_types/controls/percentile_ranks.html');
    // required by the values editor
    require('components/number_list/number_list');

    var valueProps = {
      makeLabel: function () {
        var field = this.field();
        var format = (field && field.format) || fieldFormats.getDefaultInstance('number');

        return 'Percentile rank ' + format.convert(this.key, 'text') + ' of "' + this.fieldDisplayName() + '"';
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
      getFormat: function () {
        return fieldFormats.getInstance('percent') || fieldFormats.getDefaultInstance('number');
      },
      getValue: function (agg, bucket) {
        // values for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        }) / 100;
      }
    });
  };
});
