import { get } from 'lodash';

export default (path) => {
  const state = {
    app: {}, // Kibana stuff in here
    transient: {
      throwAway: {}
    },
    persistent: {
      throwAway: {
        expression: 'demodata()'
      }
    }
  };

  if (!path) {
    return state;
  }

  return get(state, path);
};
