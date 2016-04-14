define(function (require) {
  return function AggTypeMetricPercentilesProvider(Private) {
    let _ = require('lodash');

    let MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    let getResponseAggConfigClass = Private(require('ui/agg_types/metrics/getResponseAggConfigClass'));
    let ordinalSuffix = require('ui/utils/ordinal_suffix');
    let fieldFormats = Private(require('ui/registry/field_formats'));

    let percentsEditor = require('ui/agg_types/controls/percentiles.html');
    // required by the percentiles editor
    require('ui/number_list');

    let valueProps = {
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
        let ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

        return agg.params.percents.map(function (percent) {
          return new ValueAggConfig(percent);
        });
      },
      getValue: function (agg, bucket) {
        // percentiles for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId] && bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});
