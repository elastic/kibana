import { get } from 'lodash';
import { getDefaultWorkpad } from './defaults';

export default (path) => {

  const state = {
    app: {}, // Kibana stuff in here
    transient: {
      editing: true,
      selectedElement: null,
      resolvedArgs: {},
      // values in resolvedArgs should live under a unique index so they can be looked up.
      // The ID of the element is a great example.
      // In there will live an object with a status (string), value (any), and error (bool) property.
      // If the error proprty is true, the value will be the error object.
      // See the resolved_args reducer for more information.
    },
    persistent: {
      schemaVersion: 0,
      workpad: getDefaultWorkpad(),
    },
  };

  if (!path) {
    return state;
  }

  return get(state, path);
};
