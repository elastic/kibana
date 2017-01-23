import React from 'react';
import modules from 'ui/modules';
import { createStore, applyMiddleware, compose } from 'redux';
import onStart from './on_start';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import rootReducer from './reducers';
import getInitialState from './initial_state';
import _ from 'lodash';


const app = modules.get('apps/rework');

app.service('$store', (kbnVersion, basePath) => {

  const initialState = getInitialState();
  // Set the defaults from Kibana plugin
  initialState.app.kbnVersion = kbnVersion;
  initialState.app.basePath = basePath;

  const persistentStore = compose(
    applyMiddleware(thunk),
    persistState('persistent', {key: 'rework-persistent'}),
  );

  const store = createStore(rootReducer, initialState, persistentStore);


  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  onStart(store);

  return store;
});
