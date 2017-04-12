import _ from 'lodash';
export default function PointSeriesInitYAxis() {

  return function initYAxis(chart) {
    const y = chart.aspects.y;
    const x = chart.aspects.x;

    if (_.isArray(y)) {
      // TODO: vis option should allow choosing this format
      chart.yAxisFormatter = y[0].agg.fieldFormatter();
      chart.yAxisLabel = ''; // use the legend
    } else {
      chart.yAxisFormatter = y.agg.fieldFormatter();
      chart.yAxisLabel = y.col.title;
    }

    const z = chart.aspects.series;
    if (z) {
      if (_.isArray(z)) {
        chart.zAxisFormatter = z[0].agg.fieldFormatter();
        chart.zAxisLabel = ''; // use the legend
      } else {
        chart.zAxisFormatter = z.agg.fieldFormatter();
        chart.zAxisLabel = z.col.title;
      }
    }


    const xAggOutput = x.agg.write();
    chart.yScale = xAggOutput.metricScale || null;
  };
}
