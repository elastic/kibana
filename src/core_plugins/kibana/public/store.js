import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import { reducers } from './reducers';

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION__ && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export const store = createStore(
  reducers,
  {},
  compose(...enhancers)
);
