import { createStore } from 'redux';
import rootReducer from './reducers/root_reducer';
import getInitialState from './initial_state';
import { uiModules } from 'ui/modules';

const app = uiModules.get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {

  const initialState = getInitialState();
  // Set the defaults from Kibana plugin
  initialState.app = { kbnVersion, basePath };

  const store = createStore(rootReducer, initialState);

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
