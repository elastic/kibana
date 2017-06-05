import { get } from 'lodash';
import { Model } from '../model';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';

export const pointseries = () => new Model('pointseries', {
  displayName: 'Pointseries Model',
  args: [
    new Arg('x', {
      displayName: 'X-axis',
      argType: 'datacolumn',
    }),
    new Arg('y', {
      displayName: 'Y-axis',
      argType: 'datacolumn',
    }),
    new Arg('color', {
      displayName: 'Color',
      argType: 'datacolumn',
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
