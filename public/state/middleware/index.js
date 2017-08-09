import { applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import persistState from 'redux-localstorage';
import { esPersistMiddleware } from './es_persist';
import { historyMiddleware } from './history';
import { inFlight } from './in_flight';
import { appReady } from './app_ready';

const storageKey = 'canvas';

const middlewares = [
  applyMiddleware(thunkMiddleware, esPersistMiddleware, historyMiddleware(window), inFlight, appReady),
  persistState('persistent', { key: storageKey }),
];

if (window.__REDUX_DEVTOOLS_EXTENSION__) middlewares.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export default compose(...middlewares);
