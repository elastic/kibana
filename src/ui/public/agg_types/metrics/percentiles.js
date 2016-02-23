import _ from 'lodash';
import ordinalSuffix from 'ui/utils/ordinal_suffix';
import percentsEditor from 'ui/agg_types/controls/percentiles.html';
import 'ui/number_list';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';
import AggTypesMetricsGetResponseAggConfigClassProvider from 'ui/agg_types/metrics/getResponseAggConfigClass';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
export default function AggTypeMetricPercentilesProvider(Private) {

  var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  var getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);
  var fieldFormats = Private(RegistryFieldFormatsProvider);

  // required by the percentiles editor

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
      var ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

      return agg.params.percents.map(function (percent) {
        return new ValueAggConfig(percent);
      });
    },
    getValue: function (agg, bucket) {
      const values = bucket[agg.parentId] && bucket[agg.parentId].values;
      const percentile = _.find(values, value => agg.key === value.key);
      return percentile ? percentile.value : null;
    }
  });
};
