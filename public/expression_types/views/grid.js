import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

export const grid = () => new View('grid', {
  displayName: 'Number or Text Grid',
  description: '',
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    new Arg('seriesStyle', {
      displayName: 'Series Style',
      argType: 'seriesStyle',
      defaultValue: 'seriesStyle',
      multi: true,
    }),
  ],
  resolve: ({ context }) => {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
