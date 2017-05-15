import { get } from 'lodash';
import { Transform } from '../transform';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';

export const sort = () => new Transform('sort', {
  displayName: 'Sort Transform',
  args: [
    new Arg('_', {
      displayName: 'Sort Field',
      argType: 'dataframe_column',
      types: ['string'],
    }),
  ],
  resolve({ context }) {
    if (getState(context) === 'ready') {
      return { columns: get(getValue(context), 'columns', []) };
    }
    return { columns: [] };
  },
});
