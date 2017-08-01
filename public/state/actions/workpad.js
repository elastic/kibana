import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { getWorkpadColors } from '../selectors/workpad';
import { fetchAllRenderables } from './elements';
import { without, includes } from 'lodash';


export const sizeWorkpad = createAction('sizeWorkpad');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});

export const setColors = createAction('setColors');

export const addColor = createThunk('addColor', ({ dispatch, getState }, color) => {
  const colors = getWorkpadColors(getState()).slice(0);
  if (!includes(colors, color)) colors.push(color);
  dispatch(setColors(colors));
});

export const removeColor = createThunk('removeColor', ({ dispatch, getState }, color) => {
  dispatch(setColors(without(getWorkpadColors(getState()), color)));
});
