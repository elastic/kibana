import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { without, includes } from 'lodash';
import * as workpadService from '../../lib/workpad_service';
import { getWorkpadColors } from '../selectors/workpad';
import { fetchAllRenderables } from './elements';
import { setAssets, resetAssets } from './assets';
import { getDefaultWorkpad } from '../defaults';

export const sizeWorkpad = createAction('sizeWorkpad');
export const setName = createAction('setName');
export const setColors = createAction('setColors');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});

export const addColor = createThunk('addColor', ({ dispatch, getState }, color) => {
  const colors = getWorkpadColors(getState()).slice(0);
  if (!includes(colors, color)) colors.push(color);
  dispatch(setColors(colors));
});

export const removeColor = createThunk('removeColor', ({ dispatch, getState }, color) => {
  dispatch(setColors(without(getWorkpadColors(getState()), color)));
});

export const setWorkpad = createThunk('setWorkpad', ({ dispatch }, workpad) => {
  const setWorkpadAction = createAction('setWorkpad');
  dispatch(setWorkpadAction(workpad));
  dispatch(initializeWorkpad());
});

export const loadWorkpad = createThunk('loadWorkpad', ({ dispatch }, workpadId) => {
  // TODO: handle the failed loading state
  workpadService.get(workpadId).then(({ assets, ...workpad }) => {
    dispatch(setWorkpad(workpad));
    dispatch(setAssets(assets));
  });
});

export const createWorkpad = createThunk('createWorkpad', ({ dispatch }) => {
  const newWorkpad = getDefaultWorkpad();

  // TODO: handle the failed loading state
  workpadService.create(newWorkpad)
  .then(() => {
    dispatch(setWorkpad(newWorkpad));
    dispatch(resetAssets());
  });
});
