/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';

import reducer from '../reducers';
import { rootSaga } from '../sagas';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const sagaMW = createSagaMiddleware();

const store = createStore(reducer, composeEnhancers(applyMiddleware(sagaMW)));

sagaMW.run(rootSaga);

export default store;
