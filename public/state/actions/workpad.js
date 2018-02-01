import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { without, includes } from 'lodash';
import * as workpadService from '../../lib/workpad_service';
import { getWorkpadColors } from '../selectors/workpad';
import { getDefaultWorkpad } from '../defaults';
import { fetchAllRenderables } from './elements';
import { setAssets, resetAssets } from './assets';

export const sizeWorkpad = createAction('sizeWorkpad');
export const setName = createAction('setName');
export const setColors = createAction('setColors');
export const setRefreshInterval = createAction('setRefreshInterval');

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

export const setWorkpad = createThunk('setWorkpad', ({ dispatch, type }, workpad) => {
  dispatch(createAction(type)(workpad)); // set the workpad object in state
  dispatch(setRefreshInterval(0)); // disable refresh interval
  dispatch(initializeWorkpad()); // load all the elements on the workpad
});

export const loadWorkpadById = createThunk('loadWorkpadById', ({ dispatch }, workpadId) => {
  // TODO: handle the failed loading state
  workpadService.get(workpadId).then(({ assets, ...workpad }) => {
    dispatch(setWorkpad(workpad));
    dispatch(setAssets(assets));
  });
});

export const createWorkpad = createThunk('createWorkpad', ({ dispatch }) => {
  const newWorkpad = getDefaultWorkpad();

  workpadService.create(newWorkpad).then(() => {
    dispatch(setWorkpad(newWorkpad));
    dispatch(resetAssets());
  });
});
