import React from 'react';
import modules from 'ui/modules';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';
import initialState from './initial_state';
import _ from 'lodash';

const app = modules.get('apps/rework');

app.service('$store', (kbnVersion, basePath) => {

  // Set the defaults from Kibana plugin
  initialState.app.kbnVersion = kbnVersion;
  initialState.app.basePath = basePath;

  const store = createStore(
    rootReducer,
    initialState,
    applyMiddleware(thunk)
  );

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  return store;
});
