import { handleActions } from 'redux-actions';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import { prepend } from '../../lib/modify_path';
import * as actions from '../actions/resolved_args';

/*
  Resolved args are a way to handle async values. They track the status, value, and error
  state thgouh the lifecycle of the request, and are an object that looks like this:

  {
    status: 'pending',
    value: null,
    error: null,
  }

  Here, the request is in flight, and the application is waiting for a value. Valid statuses
  are `initializing`, `pending`, `ready`, and `error`.

  When status is `ready`, the value will be whatever came back in the response.

  When status is `error`, the value will be the error object, and the error property will be true.
*/

function _getState(hasError, loading) {
  if (hasError) return 'error';
  if (Boolean(loading)) return 'pending';
  return 'ready';
}

function _getValue(hasError, value, oldVal) {
  if (hasError || value == null) return oldVal && oldVal.value;
  return value;
}

function getContext(value, loading = false, oldVal = null) {
  const hasError = value instanceof Error;
  return {
    state: _getState(hasError, loading),
    value: _getValue(hasError, value, oldVal),
    error: hasError ? value : null,
  };
}

function getFullPath(path) {
  const isArray = Array.isArray(path);
  const isString = (typeof path === 'string');
  if (!isArray && !isString) throw new Error(`Resolved argument path is invalid: ${path}`);
  return prepend(path, 'resolvedArgs');
}

export default handleActions({
  [actions.setLoading]: (transientState, { payload }) => {
    const { path, loading = true } = payload;
    return set(transientState, getFullPath(path), getContext(null, loading));
  },

  [actions.setValue]: (transientState, { payload }) => {
    const { path, value } = payload;
    const fullPath = getFullPath(path);
    const oldVal = get(transientState, fullPath, null);
    return set(transientState, fullPath, getContext(value, false, oldVal));
  },

  [actions.clear]: (transientState, { payload }) => {
    const { path } = payload;
    return del(transientState, getFullPath(path));
  },
}, {});
