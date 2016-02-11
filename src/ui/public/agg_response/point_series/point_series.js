import _ from 'lodash';
import AggResponsePointSeriesGetSeriesProvider from 'ui/agg_response/point_series/_get_series';
import AggResponsePointSeriesGetAspectsProvider from 'ui/agg_response/point_series/_get_aspects';
import AggResponsePointSeriesInitYAxisProvider from 'ui/agg_response/point_series/_init_y_axis';
import AggResponsePointSeriesInitXAxisProvider from 'ui/agg_response/point_series/_init_x_axis';
import AggResponsePointSeriesOrderedDateAxisProvider from 'ui/agg_response/point_series/_ordered_date_axis';
import AggResponsePointSeriesTooltipFormatterProvider from 'ui/agg_response/point_series/_tooltip_formatter';
export default function PointSeriesProvider(Private) {

  var getSeries = Private(AggResponsePointSeriesGetSeriesProvider);
  var getAspects = Private(AggResponsePointSeriesGetAspectsProvider);
  var initYAxis = Private(AggResponsePointSeriesInitYAxisProvider);
  var initXAxis = Private(AggResponsePointSeriesInitXAxisProvider);
  var setupOrderedDateXAxis = Private(AggResponsePointSeriesOrderedDateAxisProvider);
  var tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);

  return function pointSeriesChartDataFromTable(vis, table) {
    var chart = {};
    var aspects = chart.aspects = getAspects(vis, table);

    chart.tooltipFormatter = tooltipFormatter;

    initXAxis(chart);
    initYAxis(chart);

    var datedX = aspects.x.agg.type.ordered && aspects.x.agg.type.ordered.date;
    if (datedX) {
      setupOrderedDateXAxis(vis, chart);
    }

    chart.series = getSeries(table.rows, chart);

    delete chart.aspects;
    return chart;
  };
};
