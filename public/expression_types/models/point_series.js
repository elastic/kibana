import { get } from 'lodash';
import { Model } from '../model';
import { Arg } from '../arg';
import { getState, getValue } from '../../state/selectors/resolved_args';

export const pointseries = () => new Model('pointseries', {
  displayName: 'Pointseries Model',
  args: [
    new Arg('x', {
      displayName: 'X-axis',
      argType: 'dataframe_column',
      types: ['string'],
    }),
    new Arg('y', {
      displayName: 'Y-axis',
      argType: 'dataframe_column',
      types: ['string'],
    }),
    new Arg('color', {
      displayName: 'Color',
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
