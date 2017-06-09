import { createStore } from 'redux';
import { uiModules } from 'ui/modules';
import getInitialState from './initial_state';
import middleware from './middleware';
import getRootReducer from './reducers';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {
  const initialState = getInitialState();
  initialState.app = { kbnVersion, basePath }; // Set the defaults from Kibana plugin

  const rootReducer = getRootReducer(initialState);
  return createStore(rootReducer, initialState, middleware);
});
