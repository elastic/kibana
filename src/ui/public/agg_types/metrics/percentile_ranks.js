define(function (require) {
  return function AggTypeMetricPercentileRanksProvider(Private) {
    let _ = require('lodash');

    let MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    let getResponseAggConfigClass = Private(require('ui/agg_types/metrics/getResponseAggConfigClass'));
    let fieldFormats = Private(require('ui/registry/field_formats'));

    let valuesEditor = require('ui/agg_types/controls/percentile_ranks.html');
    // required by the values editor
    require('ui/number_list');

    let valueProps = {
      makeLabel: function () {
        let field = this.field();
        let format = (field && field.format) || fieldFormats.getDefaultInstance('number');

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
        let ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

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
        return _.find(bucket[agg.parentId] && bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        }) / 100;
      }
    });
  };
});
