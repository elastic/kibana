import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';


export const pie = () => new View('pie', {
  displayName: 'Pie Chart',
  description: 'Show your data, as a pie chart',
  modelArgs: ['color', 'size'],
  args: [
    new Arg('palette', {
      displayName: 'Color palette',
      argType: 'palette',
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color')) };
  },
});
