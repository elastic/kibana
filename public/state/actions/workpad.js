import { createAction } from 'redux-actions';
import {dataframeResolveAll} from './dataframe';
import {elementResolveAll} from './element';

export const workpadHeight = createAction('WORKPAD_HEIGHT');
export const workpadWidth = createAction('WORKPAD_WIDTH');
export const workpadName = createAction('WORKPAD_NAME');
export const workpadReplace = createAction('WORKPAD_REPLACE');
export const workpadTime = createAction('WORKPAD_TIME');

export function workpadNew() {
  return (dispatch, getState) => {
    const action = createAction('WORKPAD_NEW');
    dispatch(action());
    dispatch(workpadInit());
  };
}

export function workpadInit() {
  return (dispatch, getState) => {
    dispatch(elementResolveAll());
    dispatch(dataframeResolveAll());
  };
}

export function workpadLoad(workpad) {
  return (dispatch, getState) => {
    const action = createAction('WORKPAD_LOAD');
    dispatch(action(workpad));
    dispatch(workpadInit());
  };
}
