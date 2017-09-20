import _ from 'lodash';
import { PointSeriesGetSeriesProvider } from 'ui/agg_response/point_series/_get_series';
import { PointSeriesGetAspectsProvider } from 'ui/agg_response/point_series/_get_aspects';
import { PointSeriesInitYAxisProvider } from 'ui/agg_response/point_series/_init_y_axis';
import { PointSeriesInitXAxisProvider } from 'ui/agg_response/point_series/_init_x_axis';
import { PointSeriesOrderedDateAxisProvider } from 'ui/agg_response/point_series/_ordered_date_axis';
import { PointSeriesTooltipFormatter } from 'ui/agg_response/point_series/_tooltip_formatter';
import { EmbeddedTooltipFormatterProvider } from 'ui/agg_response/_embedded_tooltip_formatter';

export function AggResponsePointSeriesProvider(Private) {

  const getSeries = Private(PointSeriesGetSeriesProvider);
  const getAspects = Private(PointSeriesGetAspectsProvider);
  const initYAxis = Private(PointSeriesInitYAxisProvider);
  const initXAxis = Private(PointSeriesInitXAxisProvider);
  const setupOrderedDateXAxis = Private(PointSeriesOrderedDateAxisProvider);
  const metricTooltipFormatter = Private(PointSeriesTooltipFormatter);

  return function pointSeriesChartDataFromTable(vis, table) {
    const embeddedTooltipFormatter = Private(EmbeddedTooltipFormatterProvider);
    const chart = {};
    const aspects = chart.aspects = getAspects(vis, table);

    if (_.get(vis, 'params.tooltip.type') === 'vis' && _.has(vis, 'params.tooltip.vis') ) {
      chart.tooltipFormatter = embeddedTooltipFormatter(vis);
    } else {
      chart.tooltipFormatter = metricTooltipFormatter;
    }

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
