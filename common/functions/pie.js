import { get, map, groupBy, sortBy } from 'lodash';
import keyBy from 'lodash.keyby';
import { getColorsFromPalette } from '../lib/get_colors_from_palette';

export const pie = () => ({
  name: 'pie',
  aliases: [],
  type: 'render',
  help: 'Configure a pie chart element',
  context: {
    types: ['pointseries'],
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
    labels: {
      types: ['boolean'],
      default: true,
      help: 'Show pie labels',
    },
    labelRadius: {
      types: ['number'],
      default: 100,
      help: 'Percentage of area of container to use as radius for the label circle',
    },
    strokeColor: {
      types: ['string'],
      default: '#000000',
      help: "A color for the outline of the pie and it's slices",
    },
    strokeWidth: {
      types: ['number'],
      default: 0,
      help: 'Weight of stroke in pixels',
    },
    font: {
      types: ['style'],
      help: 'Label font',
      default: '{font}',
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
        item.color = get(seriesStyle, 'color');
      }

      return item;
    });

    return {
      type: 'render',
      as: 'pie',
      value: {
        font: args.font,
        data: sortBy(data, 'label'),
        options: {
          canvas: false,
          colors: getColorsFromPalette(args.palette, data.length),
          legend: {
            show: false,
          },
          grid: {
            show: false,
          },
          series: {
            pie: {
              show: true,
              innerRadius: Math.max(args.hole, 0) / 100,
              stroke: {
                color: args.strokeColor,
                width: Math.max(args.strokeWidth, 0),
              },
              label: {
                show: args.labels,
                radius: (args.labelRadius >= 0 ? args.labelRadius : 100) / 100,
              },
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
