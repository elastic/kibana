import { ordinalSuffix } from 'ui/utils/ordinal_suffix';
import percentsEditor from 'ui/agg_types/controls/percentiles.html';
import 'ui/number_list';
import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';
import { AggTypesMetricsGetResponseAggConfigClassProvider } from 'ui/agg_types/metrics/get_response_agg_config_class';
import { getPercentileValue } from './percentiles_get_value';

export function AggTypesMetricsPercentilesProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);

  // required by the percentiles editor

  const valueProps = {
    makeLabel: function () {
      const label = this.params.customLabel || this.getFieldDisplayName();
      return ordinalSuffix(this.key) + ' percentile of ' + label;
    }
  };

  return new MetricAggType({
    name: 'percentiles',
    title: 'Percentiles',
    makeLabel: function (agg) {
      return 'Percentiles of ' + agg.getFieldDisplayName();
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
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        }
      }
    ],
    getResponseAggs: function (agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

      return agg.params.percents.map(function (percent) {
        return new ValueAggConfig(percent);
      });
    },
    getValue: getPercentileValue
  });
}
