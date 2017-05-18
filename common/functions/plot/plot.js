const Fn = require('../fn.js');
import { groupBy, keyBy, get, map, sortBy } from 'lodash';

/*
esdocs(size=1000).alterColumn(column=@timestamp, type=date, name=time)
.pointseries(x=time, y=.math("sum(bytes)"),  color=geo.country_code)
.plot(
  seriesStyle=seriesStyle(label='US', color=#333, line=0, bars=0.25, points=1),
  defaultStyle=seriesStyle(label='US', color=#333, line=0, bars=0.25, points=1)
)

demodata()
.pointseries(x=country, y=.math("sum(cost)"),  color=country)
.plot(
  seriesStyle=seriesStyle(label='CN', color=#c66, line=1, bars=1, points=0),
  seriesStyle=seriesStyle(label='US', color=#6cc, line=1, bars=1, points=0),
  defaultStyle=seriesStyle(label='US', color=#333, line=0, bars=0.25, points=0)
)
*/

module.exports = new Fn({
  name: 'plot',
  aliases: [],
  type: 'render',
  help: 'Produces a plot chart',
  context: {
    types: [
      'pointseries',
    ],
  },
  args: {
    seriesStyle: {
      multi: true,
      types: ['seriesStyle', 'null'],
      help: 'A style of a specific series',
    },
    defaultStyle: {
      multi: false,
      types: ['seriesStyle', 'null'],
      help: 'The default style to use for a series',
    },
    palette: {
      types: ['palette', 'null'],
      help: 'A palette object for describing the colors to use on this plot',
      default: {
        type: 'palette',
        colors: ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'],
        gradient: false,
      },
    },
  },
  fn: (context, args) => {
    function seriesStyleToFlot(seriesStyle) {
      if (!seriesStyle) return {};
      return {
        lines: {
          show: get(seriesStyle, 'lines') > 0,
          lineWidth: get(seriesStyle, 'line'),
          steps: get(seriesStyle, 'steps'),
          fillColor: get(seriesStyle, 'color'),
          fill: get(seriesStyle, 'fill') / 10,
        },
        bars: {
          show: get(seriesStyle, 'bars') > 0,
          barWidth: get(seriesStyle, 'bars'),
          fill: 1,
          align: 'center',
        },
        points: {
          // This is how we can vary shape and size of points
          symbol: 'circle',
          show: get(seriesStyle, 'points') > 0,
          radius: get(seriesStyle, 'points'),
          lineWidth: get(seriesStyle, 'weight'),
          fill: true,
        },
        color: get(seriesStyle, 'color'),
      };
    }

    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};

    const ticks = {
      x: {
        hash: {},
        counter: 0,
      },
      y: {
        hash: {},
        counter: 0,
      },
    };

    context.rows = sortBy(context.rows, ['x', 'y', 'color', 'size']);

    if (context.columns.x.type === 'string') {
      sortBy(context.rows, ['x']).forEach(row => {
        if (!ticks.x.hash[row.x]) {
          ticks.x.hash[row.x] = ticks.x.counter++;
        }
      });
    }

    if (context.columns.y.type === 'string') {
      sortBy(context.rows, ['y']).reverse().forEach(row => {
        if (!ticks.y.hash[row.y]) {
          ticks.y.hash[row.y] = ticks.y.counter++;
        }
      });
    }

    const data = map(groupBy(context.rows, 'color'), (series, label) => {
      const seriesStyle = seriesStyles[label];
      const result = {
        label: label,
        data: series.map(point => {
          const attrs = {};
          const x = context.columns.x.type === 'string' ? ticks.x.hash[point.x] : point.x;
          const y = context.columns.y.type === 'string' ? ticks.y.hash[point.y] : point.y;

          if (point.size != null) attrs.size = point.size;

          return [x, y, attrs];
        }),
      };

      if (seriesStyle) {
        Object.assign(result, seriesStyleToFlot(seriesStyle));
      }
      return result;
    });

    const result = {
      type: 'render',
      as: 'plot',
      value: {
        data: data,
        options: {
          colors: args.palette.colors,
          legend: {
            show: false,
          },
          grid: {
            borderWidth: 0,
            borderColor: null,
            color: 'rgba(0,0,0,0)',
            labelMargin: 30,
            margin: {
              right: 30,
              top: 20,
              bottom: 0,
              left: 0,
            },
          },
          xaxis: {
            ticks: context.columns.x.type === 'string' ? map(ticks.x.hash, (position, name) => [position, name]) : undefined,
            mode: context.columns.x.type === 'date' ? 'time' : undefined,
          },
          yaxis: {
            ticks: context.columns.y.type === 'string' ? map(ticks.y.hash, (position, name) => [position, name]) : undefined,
            mode: context.columns.y.type === 'date' ? 'time' : undefined,
          },
          series: Object.assign({
            lines: {
              lineWidth: 2,
            },
            bubbles: {
              active: true,
              show: true,
            },
            shadowSize: 0,
          }, seriesStyleToFlot(args.defaultStyle)),
        },
      },
    };

    return result;
  },
});
