import fetch from 'isomorphic-fetch';
import { createAction } from 'redux-actions';
import { dataframeResolveAll } from './dataframe';
import { elementResolveAll } from './element';
import { toJson } from '../../lib/resolve_fetch';

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

export function workpadLoad(id) {
  return (dispatch, getState) => {
    const action = createAction('WORKPAD_LOAD', id => {
      return fetch('../api/rework/get/' + id, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'kbn-xsrf': 'turdSandwich',
        }
      })
      .then(toJson('resp._source'));
    });

    dispatch(action(id));
    dispatch(workpadInit());
  };
}

export function workdpadLoadAll() {
  return (dispatch) => {
    const action = createAction('WORKPAD_LOAD_ALL', () => {
      return fetch('../api/rework/find?name=', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'kbn-xsrf': 'turdSandwich',
        }
      })
      .then(toJson('workpads'));
    });

    dispatch(action());
    dispatch(workpadInit());
  };
}

export function workpadDelete(id) {
  return (dispatch) => {
    const startAction = createAction('WORKPAD_DELETE_START');
    const action = createAction('WORKPAD_DELETE', id => {
      return fetch('../api/rework/delete/' + id, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'kbn-xsrf': 'turdSandwich',
        }
      })
      .then(toJson('resp._id'));
    });

    dispatch(startAction(id));
    dispatch(action(id));
    dispatch(workpadInit());
  };
}