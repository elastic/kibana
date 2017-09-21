import Fn from '../fn.js';
import { get, map, groupBy, sortBy, keyBy } from 'lodash';
import chroma from 'chroma-js';

export default new Fn({
  name: 'pie',
  aliases: [],
  type: 'render',
  help: 'Produces a pie chart',
  context: {
    types: [
      'pointseries',
    ],
  },
  args: {
    palette: {
      types: ['palette', 'null'],
      help: 'A palette object for describing the colors to use on this pie',
      default: '{palette}',
    },
    seriesStyle: {
      multi: true,
      types: ['seriesStyle', 'null'],
      help: 'A style of a specific series',
    },
    hole: {
      types: ['number'],
      default: 0,
      help: 'Draw a hole in the pie, 0-100, as a percentage of the pie radius',
    },
    strokeColor: {
      types: ['string'],
      default: '#000000',
      help: 'A color for the outline of the pie and it\'s slices',
    },
    strokeWidth: {
      types: ['number'],
      default: 0,
      help: 'Weight of stroke in pixels',
    },
    combine: {
      types: ['number'],
      default: 3,
      help: 'Combine slices that represent less than this percent, into one big "Other" slice',
    },
  },
  fn: (context, args) => {
    const rows = sortBy(context.rows, ['color', 'size']);
    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};

    const data = map(groupBy(rows, 'color'), (series, label) => {
      const item = {
        label: label,
        data: series.map(point => point.size || 1),
      };

      const seriesStyle = seriesStyles[label];

      // append series style, if there is a match
      if (seriesStyle) {
        Object.assign(item, { color: get(seriesStyle, 'color') });
      }

      return item;
    });

    const colors = args.palette.gradient ? chroma.scale(args.palette.colors).colors(data.length) : args.palette.colors;

    return {
      type: 'render',
      as: 'pie',
      value: {
        data: sortBy(data, 'label'),
        options: {
          canvas: false,
          colors: colors,
          legend: {
            show: false,
          },
          grid: {
            show: false,
          },
          series: {
            pie: {
              show: true,
              innerRadius: args.hole / 100,
              stroke: {
                color: args.strokeColor,
                width: args.strokeWidth,
              },
              combine: {
                threshold: args.combine / 100,
              },
            },
            label: {
              show: true,
            },
            bubbles: {
              show: false,
            },
            shadowSize: 0,
          },
        },
      },
    };
  },
});
