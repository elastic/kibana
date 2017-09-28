import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

export const pie = () => new View('pie', {
  displayName: 'Pie Chart',
  description: 'Show your data, as a pie chart',
  modelArgs: ['color', 'size'],
  args: [
    new Arg('font', {
      displayName: 'Text settings',
      description: 'Fonts, alignment and color',
      argType: 'font',
    }),
    new Arg('palette', {
      displayName: 'Color palette',
      argType: 'palette',
    }),
    new Arg('seriesStyle', {
      displayName: 'Series Style',
      argType: 'seriesStyle',
      defaultValue: '{seriesStyle points=5}',
      multi: true,
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
