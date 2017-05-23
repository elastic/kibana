import { get } from 'lodash';

// page getters
export function getEditing(state) {
  return get(state, 'transient.editing');
}
