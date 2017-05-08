import { handleActions } from 'redux-actions';
import { get } from 'lodash';
import { set, del } from 'object-path-immutable';
import * as actions from '../actions/resolved_args';

function _getState(hasError, loading) {
  if (hasError) return 'error';
  if (Boolean(loading)) return 'pending';
  return 'ready';
}

function _getValue(hasError, value, oldVal) {
  if (hasError || value == null) return oldVal;
  return value;
}

function getContext(value, loading, oldVal = null) {
  const hasError = value instanceof Error;
  return {
    state: _getState(hasError, loading),
    value: _getValue(hasError, value, oldVal),
    error: hasError ? value : null,
  };
}

function getFullPath(path) {
  const pre = 'resolvedArgs';
  const isArray = Array.isArray(path);
  const isString = (typeof path === 'string');

  if (!isArray && !isString) throw new Error(`Resolved argument path is invalid: ${path}`);
  return (isArray) ? [pre].concat(path) : `${pre}.${path}`;
}

const resolvedArgs = handleActions({
  [actions.setLoading]: (transientState, { payload }) => {
    const { path, loading = true } = payload;
    return set(transientState, getFullPath(path), getContext(null, loading));
  },

  [actions.setValue]: (transientState, { payload }) => {
    const { path, value } = payload;
    const oldVal = get(transientState, getFullPath(path), null);
    return set(transientState, getFullPath(path), getContext(value, false, oldVal));
  },

  [actions.clear]: (transientState, { payload }) => {
    const { path } = payload;
    return del(transientState, getFullPath(path));
  },
}, {});

export default resolvedArgs;