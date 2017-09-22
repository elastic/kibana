import { createStore } from 'redux';
import middleware from './middleware';
import getRootReducer from './reducers';

let store;

export function setStore(initialState) {
  const rootReducer = getRootReducer(initialState);
  store = createStore(rootReducer, initialState, middleware);
  return store;
}

export function getState() {
  return store.getState();
}
