import { withState } from 'recompose';
import { Datatable as Component } from './datatable';

export const Datatable = withState('perPage', 'setPerPage', 10)(Component);
