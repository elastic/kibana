import _ from 'lodash';
import $ from 'jquery';

export const verticalBar = (elem, args) => {

  // Data manipulation

  let valueObj;
  if (args.group_by) {
    valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
  } else {
    valueObj = args.dataframe.aggregate[args.aggregate_with](args.value_column);
  };

  const data = [];
  const ticks = [];
  _.each(_.toPairs(valueObj), (pair, i) => {
    data.push([i, pair[1]]);
    ticks.push([i, pair[0]]);
  });

  // Flot setup

  const flotConfig = {
    series: {
      bars: {
        show: true,
        barWidth: 0.6,
        align: 'center',
        fill: 1,
      },
    },
    xaxis: {},
    yaxis: {
      autoscaleMargin: 0.2,
      ticks: [],
      tickLength: 0
    },
    legend: {
      show: false
    },
    grid: {
      color: 'rgba(0,0,0,0)'
    },
    colors: args.theme
  };

  flotConfig.xaxis.ticks = ticks;

  // Chart drawing

  const plot = $.plot($(elem), [data], flotConfig);

  const barWidthPixels =  plot.getOptions().series.bars.barWidth * plot.getXAxes()[0].scale;
  _.each(plot.getData()[0].data, (point, i) => {
    var o = plot.pointOffset({x: point[0], y: point[1]});
    $('<div class="rework--chart-value">' + point[1] + '</div>').css({
      position: 'absolute',
      width: barWidthPixels,
      height: args.value_style.object.fontSize,
      left: o.left - (barWidthPixels / 2),
      top: o.top - 10 - args.value_style.object.fontSize,
    }).appendTo(plot.getPlaceholder());
  });
};
