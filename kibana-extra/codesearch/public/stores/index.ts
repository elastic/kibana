/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import createSagaMiddleware from 'redux-saga';

import { connectRouter, LOCATION_CHANGE, routerMiddleware } from 'connected-react-router';
import { applyMiddleware, compose, createStore } from 'redux';

import { rootReducer } from '../reducers';
import { rootSaga } from '../sagas';
import { history } from '../utils/url';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const sagaMW = createSagaMiddleware();

export const store = createStore(
  connectRouter(history)(rootReducer),
  composeEnhancers(applyMiddleware(sagaMW), applyMiddleware(routerMiddleware(history)))
);

sagaMW.run(rootSaga);
store.dispatch({ type: LOCATION_CHANGE, payload: { action: 'PUSH', location: history.location } });
