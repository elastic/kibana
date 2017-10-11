import { get } from 'lodash';
import { Model } from '../model';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';

export const pointseries = () => new Model('pointseries', {
  displayName: 'Dimensions & Measures',
  args: [
    new Arg('x', {
      displayName: 'X-axis',
      description: 'Data along the horizontal axis. Usually a number, string or date',
      argType: 'datacolumn',
    }),
    new Arg('y', {
      displayName: 'Y-axis',
      description: 'Data along the vertical axis. Usually a number.',
      argType: 'datacolumn',
    }),
    new Arg('color', {
      displayName: 'Color',
      description: 'Determines the color of a mark or series',
      argType: 'datacolumn',
    }),
    new Arg('size', {
      displayName: 'Size',
      description: 'Determine the size of a mark',
      argType: 'datacolumn',
    }),
    new Arg('text', {
      displayName: 'Text',
      description: 'Set the text to use as, or around, the mark',
      argType: 'datacolumn',
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
