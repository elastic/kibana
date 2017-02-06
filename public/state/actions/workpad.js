import { createAction } from 'redux-actions';
import {dataframeResolveAll} from './dataframe';
import {elementResolveAll} from './element';

export const workpadProps = createAction('WORKPAD_PROPS');
export const workpadReplace = createAction('WORKPAD_REPLACE');

export function workpadNew() {
  return (dispatch, getState) => {
    const action = createAction('WORKPAD_NEW');
    dispatch(action());
    dispatch(workpadInit());
  };
}

export function workpadInit() {
  return (dispatch, getState) => {
    dispatch(dataframeResolveAll());
    dispatch(elementResolveAll());
  };
}

export function workpadLoad(workpad) {
  return (dispatch, getState) => {
    const action = createAction('WORKPAD_LOAD');
    dispatch(action(workpad));
    dispatch(workpadInit());
  };
}
