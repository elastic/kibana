import React from 'react';
import modules from 'ui/modules';
import { createStore, applyMiddleware, compose } from 'redux';

import onStart from './on_start';
import thunkMiddleware from 'redux-thunk';
import promiseMiddleware from 'redux-promise';
import persistState from 'redux-localstorage';
import rootReducer from './reducers';
import {bindHotkeys} from './hotkeys';
import getInitialState from './initial_state';
import _ from 'lodash';


const app = modules.get('apps/rework');

app.service('$store', (kbnVersion, basePath) => {

  const initialState = getInitialState();
  // Set the defaults from Kibana plugin
  initialState.app = { kbnVersion, basePath };

  // Limit redux updates to 20FPS
  //const debounceNotify = _.debounce(notify => notify(), 50, {maxWait: 50});
  const persistentStore = compose(
    applyMiddleware(thunkMiddleware, promiseMiddleware),
    persistState('persistent', {key: 'rework-persistent'}),
  );

  const store = createStore(rootReducer, initialState, persistentStore);
  bindHotkeys(store);

  // TODO: Sticking this here so I can dispatch events from the console;
  window.store = store;

  onStart(store);

  return store;
});
