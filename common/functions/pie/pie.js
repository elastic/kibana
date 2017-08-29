import Fn from '../fn.js';
import { groupBy, map, sortBy } from 'lodash';
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
      default: {
        type: 'palette',
        colors: ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'],
        gradient: false,
      },
    },
  },
  fn: (context, args) => {
    const rows = sortBy(context.rows, ['color', 'size']);

    const data = map(groupBy(rows, 'color'), (series, label) => ({
      label: label,
      data: series.map(point => point.size || 1),
    }));

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
            show: true,
          },
          grid: {
            show: false,
          },
          series: {
            pie: {
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
