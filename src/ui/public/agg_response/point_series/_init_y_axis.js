import _ from 'lodash';
export default function PointSeriesInitYAxis() {

  return function initYAxis(chart) {
    let y = chart.aspects.y;
    let x = chart.aspects.x;

    if (_.isArray(y)) {
      // TODO: vis option should allow choosing this format
      chart.yAxisFormatter = y[0].agg.fieldFormatter();
      chart.yAxisLabel = ''; // use the legend
      var secondaryYAxis = _.first(_(y).filter(function (yAxis) { return yAxis.agg.onSecondaryYAxis; }).value());
      if (secondaryYAxis) {
        chart.secondYAxisFormatter = secondaryYAxis.agg.fieldFormatter();
        chart.secondYAxisLabel = secondaryYAxis.col.title;
      }
    } else {
      chart.yAxisFormatter = y.agg.fieldFormatter();
      chart.yAxisLabel = y.col.title;
    }

    let xAggOutput = x.agg.write();
    chart.yScale = xAggOutput.metricScale || null;
  };
};
