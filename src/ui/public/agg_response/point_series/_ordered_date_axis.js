import moment from 'moment';

export function PointSeriesOrderedDateAxisProvider() {

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

    const bounds = buckets.getBounds();
    if (bounds) {
      chart.ordered.min = bounds.min;
      chart.ordered.max = bounds.max;
    } else {
      chart.ordered.endzones = false;
    }
  };
}
