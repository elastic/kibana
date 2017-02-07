import _ from 'lodash';
import $ from 'jquery';

export const horizontalBar = (elem, args) => {

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
    data.push([pair[1], i]);
    ticks.push([i, pair[0]]);
  });

  // Flot setup

  const flotConfig = {
    series: {
      bars: {
        show: true,
        horizontal: true,
        barWidth: 0.6,
        align: 'center',
        fill: 1,
      },
    },
    xaxis: {
      autoscaleMargin: 0.25,
      ticks: [],
      tickLength: 0
    },
    yaxis: {
    },
    legend: {
      show: false
    },
    grid: {
      color: 'rgba(0,0,0,0)'
    },
    colors: args.theme
  };

  flotConfig.yaxis.ticks = ticks;

  // Chart drawing

  const plot = $.plot($(elem), [data], flotConfig);

  const barWidthPixels =  plot.getOptions().series.bars.barWidth * plot.getYAxes()[0].scale;
  _.each(plot.getData()[0].data, (point, i) => {
    var o = plot.pointOffset({x: point[0], y: point[1]});
    $('<div class="rework--chart-value">' + point[0] + '</div>').css({
      position: 'absolute',
      height: barWidthPixels,
      left: o.left + 5,
      top: o.top - 10
    }).appendTo(plot.getPlaceholder());
  });
};
