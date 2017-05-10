const Fn = require('../fn.js');
import { groupBy, keyBy, get, map } from 'lodash';

/*
esdocs(size=1000).alterColumn(column=@timestamp, type=date, name=time)
.pointseries(x=time, y=.math("sum(bytes)"),  color=geo.country_code)
.plot(
  seriesStyle=seriesStyle(label='US', color=#333, line=0, bars=0.25, points=1),
  defaultStyle=seriesStyle(label='US', color=#333, line=0, bars=0.25, points=1)
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
  },
  fn: (context, args) => {
    function seriesStyleToFlot(seriesStyle) {
      if (!seriesStyle) return {};
      return {
        lines: {
          show: get(seriesStyle, 'line') > 0,
          lineWidth: get(seriesStyle, 'line'),
          steps: get(seriesStyle, 'steps'),
          fillColor: get(seriesStyle, 'color'),
          fill: get(seriesStyle, 'fill') / 10,
        },
        bars: {
          show: get(seriesStyle, 'bars') > 0,
          lineWidth: get(seriesStyle, 'bars'),
        },
        points: {
          symbol: 'circle',
          show: get(seriesStyle, 'points') > 0,
          radius: get(seriesStyle, 'points'),
          lineWidth: get(seriesStyle, 'weight'),
          fill: true,
        },
        color: get(seriesStyle, 'color'),
      };
    }

    function getData(series) {
      return series.map(point => [point.x, point.y, point.size]);
    }

    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};
    const data = map(groupBy(context.rows, 'color'), (series, label) => {
      const seriesStyle = seriesStyles[label];
      const result = {
        label: label,
        data: getData(series),
      };

      if (seriesStyle) {
        Object.assign(result, seriesStyleToFlot(seriesStyle));
      }
      return result;
    });

    console.log('data', data);

    return {
      type: 'render',
      as: 'plot',
      value: {
        data: data,
        options: {
          legend: {
            show: false,
          },
          grid: {
            borderWidth: 0,
            borderColor: null,
            color: 'rgba(0,0,0,0)',
          },
          xaxis: {
            mode: context.columns.x.type === 'date' ? 'time' : null,
          },
          series: Object.assign({
            lines: {
              lineWidth: 2,
            },
            shadowSize: 0,
          }, seriesStyleToFlot(args.defaultStyle)),
        },
      },
    };
  },
});
