import React from 'react';
import { createStore, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import rootReducer from './reducers/root_reducer';
import getInitialState from './initial_state';

const app = require('ui/modules').get('apps/canvas');

app.service('$store', (kbnVersion, basePath) => {

  const initialState = getInitialState();
  // Set the defaults from Kibana plugin
  initialState.app = { kbnVersion, basePath };

  // Limit redux updates to 20FPS
  //const debounceNotify = _.debounce(notify => notify(), 50, {maxWait: 50});
  const persistentStore = compose(
    applyMiddleware(thunkMiddleware),
  );

  const store = createStore(rootReducer, initialState, persistentStore);

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
