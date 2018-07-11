import { map, uniq } from 'lodash';
import { getState, getValue } from '../../lib/resolved_arg';
import { legendOptions } from '../../lib/legend_options';

export const pie = () => ({
  name: 'pie',
  displayName: 'Chart Style',
  modelArgs: [['color', { label: 'Slice Labels' }], ['size', { label: 'Slice Angles' }]],
  args: [
    {
      name: 'font',
      displayName: 'Text settings',
      help: 'Fonts, alignment and color',
      argType: 'font',
    },
    {
      name: 'palette',
      displayName: 'Color palette',
      argType: 'palette',
    },
    {
      name: 'seriesStyle',
      displayName: 'Series Style',
      help: 'Set the color of a specific slice, expand to select series',
      argType: 'seriesStyle',
      default: '{seriesStyle}',
      multi: true,
    },
    {
      name: 'legend',
      displayName: 'Legend Position',
      help: 'Disable or position the legend',
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
