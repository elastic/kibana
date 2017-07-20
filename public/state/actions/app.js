import { createAction } from 'redux-actions';
import { createThunk } from '../../lib/create_thunk';
import { fetch } from '../../../common/lib/fetch';

// actions to set the application state
export const appReady = createAction('appReady');
export const appError = createAction('appError');

// actions used when loading server functions
export const loadServerFunctionsStart = createAction('loadServerFunctionsStart');
export const loadServerFunctionsComplete = createAction('loadServerFunctionsComplete');
export const loadServerFunctionsError = createAction('loadServerFunctionsError');
export const loadServerFunctions = createThunk('loadServerFunctions', ({ dispatch }, basePath) => {
  dispatch(loadServerFunctionsStart());

  return fetch.get(`${basePath}/api/canvas/functions`, { params: { type: 'datatable' } })
  .then(res => res.data)
  .then(fns => dispatch(loadServerFunctionsComplete(fns)))
  .catch(err => {
    dispatch(loadServerFunctionsError(err));
    dispatch(appError(err));
  });
});
