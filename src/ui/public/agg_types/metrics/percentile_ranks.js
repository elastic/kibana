import valuesEditor from '../controls/percentile_ranks.html';
import '../../number_list';
import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { AggTypesMetricsGetResponseAggConfigClassProvider } from './get_response_agg_config_class';
import { fieldFormats } from '../../registry/field_formats';
import { getPercentileValue } from './percentiles_get_value';

export function AggTypesMetricsPercentileRanksProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);


  // required by the values editor

  const valueProps = {
    makeLabel: function () {
      const field = this.getField();
      const format = (field && field.format) || fieldFormats.getDefaultInstance('number');
      const label = this.params.customLabel || this.getFieldDisplayName();

      return 'Percentile rank ' + format.convert(this.key, 'text') + ' of "' + label + '"';
    }
  };

  return new MetricAggType({
    name: 'percentile_ranks',
    title: 'Percentile Ranks',
    makeLabel: function (agg) {
      return 'Percentile ranks of ' + agg.getFieldDisplayName();
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
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        }
      }
    ],
    getResponseAggs: function (agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

      return agg.params.values.map(function (value) {
        return new ValueAggConfig(value);
      });
    },
    getFormat: function () {
      return fieldFormats.getInstance('percent') || fieldFormats.getDefaultInstance('number');
    },
    getValue: function (agg, bucket) {
      return getPercentileValue(agg, bucket) / 100;
    }
  });
}
