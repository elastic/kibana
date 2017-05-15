import { get } from 'lodash';
import * as argHelper from '../../lib/resolved_arg';
import { prepend } from '../../lib/modify_path';

function getArg(transientState, path) {
  return get(transientState, prepend(path, 'resolvedArgs'));
}

export function getValue(transientState, path) {
  return argHelper.getValue(getArg(transientState, path));
}

export function getState(transientState, path) {
  return argHelper.getState(getArg(transientState, path));
}

export function getError(transientState, path) {
  return argHelper.getError(getArg(transientState, path));
}
