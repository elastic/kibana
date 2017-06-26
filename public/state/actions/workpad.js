import { fetchAllRenderables } from './elements';
import { createAction } from 'redux-actions';

export const sizeWorkpad = createAction('sizeWorkpad');

export const initializeWorkpad = () => (dispatch) => {
  dispatch(fetchAllRenderables());
};
