import { ordinalSuffix } from '../../utils/ordinal_suffix';
import percentsEditor from '../controls/percentiles.html';
import '../../number_list';
import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass } from './get_response_agg_config_class';
import { getPercentileValue } from './percentiles_get_value';

const valueProps = {
  makeLabel: function () {
    const label = this.params.customLabel || this.getFieldDisplayName();
    return ordinalSuffix(this.key) + ' percentile of ' + label;
  }
};

export const percentilesMetricAgg = new MetricAggType({
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
