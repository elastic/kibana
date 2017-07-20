import { createAction } from 'redux-actions';
import { createThunk } from '../../lib/create_thunk';
import { fetchAllRenderables } from './elements';

export const sizeWorkpad = createAction('sizeWorkpad');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});
