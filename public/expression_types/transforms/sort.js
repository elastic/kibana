import { get } from 'lodash';
import { getState, getValue } from '../../lib/resolved_arg';

export const sort = () => ({
  name: 'sort',
  displayName: 'Datatable Sorting',
  args: [{
    name: '_',
    displayName: 'Sort Field',
    argType: 'datacolumn',
  }],
  resolve({ context }) {
    if (getState(context) === 'ready') {
      return { columns: get(getValue(context), 'columns', []) };
    }
    return { columns: [] };
  },
});
