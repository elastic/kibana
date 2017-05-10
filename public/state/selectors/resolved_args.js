import { get } from 'lodash';
import { append, prepend } from '../../lib/modify_path';

function wrapPath(path) {
  return prepend(path, 'resolvedArgs');
}

export function getValue(transientState, path) {
  const fullPath = append(wrapPath(path), 'value');
  return get(transientState, fullPath, null);
}

export function getState(transientState, path) {
  const fullPath = append(wrapPath(path), 'state');
  return get(transientState, fullPath, 'pending');
}

export function getError(transientState, path) {
  const fullPath = append(wrapPath(path), 'error');
  return get(transientState, fullPath, null);
}
