import { get } from 'lodash';

// page getters
export function getEditing(state) {
  return get(state, 'transient.editing');
}

export function getServerFunctions(state) {
  return get(state, 'transient.serverFunctions');
}

export function getAppReady(state) {
  return get(state, 'app.ready');
}

export function isAppReady(state) {
  // return true only when the required parameters are in the state
  return Array.isArray(getServerFunctions(state));
}
