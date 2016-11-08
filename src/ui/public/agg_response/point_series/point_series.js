import AggResponsePointSeriesGetSeriesProvider from 'ui/agg_response/point_series/_get_series';
import AggResponsePointSeriesGetAspectsProvider from 'ui/agg_response/point_series/_get_aspects';
import AggResponsePointSeriesInitYAxisProvider from 'ui/agg_response/point_series/_init_y_axis';
import AggResponsePointSeriesInitXAxisProvider from 'ui/agg_response/point_series/_init_x_axis';
import AggResponsePointSeriesOrderedDateAxisProvider from 'ui/agg_response/point_series/_ordered_date_axis';
import AggResponsePointSeriesTooltipFormatterProvider from 'ui/agg_response/point_series/_tooltip_formatter';
export default function PointSeriesProvider(Private) {

  const getSeries = Private(AggResponsePointSeriesGetSeriesProvider);
  const getAspects = Private(AggResponsePointSeriesGetAspectsProvider);
  const initYAxis = Private(AggResponsePointSeriesInitYAxisProvider);
  const initXAxis = Private(AggResponsePointSeriesInitXAxisProvider);
  const setupOrderedDateXAxis = Private(AggResponsePointSeriesOrderedDateAxisProvider);
  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);

  return function pointSeriesChartDataFromTable(vis, table) {
    const chart = {};
    const aspects = chart.aspects = getAspects(vis, table);

    chart.tooltipFormatter = tooltipFormatter;

    initXAxis(chart);
    initYAxis(chart);

    const datedX = aspects.x.agg.type.ordered && aspects.x.agg.type.ordered.date;
    if (datedX) {
      setupOrderedDateXAxis(vis, chart);
    }

    chart.series = getSeries(table.rows, chart);

    delete chart.aspects;
    return chart;
  };
}
