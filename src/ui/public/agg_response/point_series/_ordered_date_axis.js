import moment from 'moment';
export default function PointSeriesOrderedDateAxis() {

  return function orderedDateAxis(vis, chart) {
    const xAgg = chart.aspects.x.agg;
    const buckets = xAgg.buckets;
    const format = buckets.getScaledDateFormat();

    chart.xAxisFormatter = function (val) {
      return moment(val).format(format);
    };

    chart.ordered = {
      date: true,
      interval: buckets.getInterval(),
    };

    const axisOnTimeField = xAgg.fieldIsTimeField();
    const bounds = buckets.getBounds();
    if (bounds && axisOnTimeField) {
      chart.ordered.min = bounds.min;
      chart.ordered.max = bounds.max;
    } else {
      chart.ordered.endzones = false;
    }
  };
}
