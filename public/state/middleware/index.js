import { applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import persistState from 'redux-localstorage';
import { historyMiddleware } from './history';

const storageKey = 'canvas';

const middlewares = [
  applyMiddleware(thunkMiddleware, historyMiddleware(window)),
  persistState('persistent', { key: storageKey }),
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
];

export default compose(...middlewares);
