import { get } from 'lodash';

export default (path) => {
  const state = {
    app: {}, // Kibana stuff in here
    transient: {},
    persistent: {}
  };

  if (!path) {
    return state;
  }

  return get(state, path);
};
