import { PointSeriesGetSeriesProvider } from './_get_series';
import { PointSeriesGetAspectsProvider } from './_get_aspects';
import { PointSeriesInitYAxisProvider } from './_init_y_axis';
import { PointSeriesInitXAxisProvider } from './_init_x_axis';
import { PointSeriesOrderedDateAxisProvider } from './_ordered_date_axis';
import { PointSeriesTooltipFormatter } from './_tooltip_formatter';

export function AggResponsePointSeriesProvider(Private) {

  const getSeries = Private(PointSeriesGetSeriesProvider);
  const getAspects = Private(PointSeriesGetAspectsProvider);
  const initYAxis = Private(PointSeriesInitYAxisProvider);
  const initXAxis = Private(PointSeriesInitXAxisProvider);
  const setupOrderedDateXAxis = Private(PointSeriesOrderedDateAxisProvider);
  const tooltipFormatter = Private(PointSeriesTooltipFormatter);

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
