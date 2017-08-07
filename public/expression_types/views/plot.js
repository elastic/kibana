import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';


export const plot = () => new View('plot', {
  displayName: 'Plot Chart',
  description: 'Show your data, as plots',
  modelArgs: ['x', 'y', 'color', 'size'],
  args: [
    new Arg('palette', {
      displayName: 'Color palette',
      argType: 'palette',
      multi: true,
    }),
    new Arg('defaultStyle', {
      displayName: 'Default style',
      argType: 'seriesStyle',
      defaultValue: 'seriesStyle(lines=1)',
    }),
    new Arg('seriesStyle', {
      displayName: 'Series style',
      argType: 'seriesStyle',
      defaultValue: 'seriesStyle(lines=1)',
      multi: true,
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color')) };
  },
});
