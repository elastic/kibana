/* eslint-disable */
import {
  INIT_DATA
} from './app.actions';

export default function app(state = {}, action) {
  switch (action.type) {
    case INIT_DATA:
      return Object.assign({}, state, {
        version: action.version,
        config: action.config,
      });
  }
  return state;
};
