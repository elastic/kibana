import { get } from 'lodash';

// page getters
export function getEditing(state) {
  return get(state, 'transient.editing');
}

export function getFunctionDefinitions(state) {
  return get(state, 'app.functionDefinitions');
}

export function getAppReady(state) {
  return get(state, 'app.ready');
}

export function getBasePath(state) {
  return get(state, 'app.basePath');
}

// return true only when the required parameters are in the state
export function isAppReady() {
  return true;
}
