/* eslint-disable */
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux'

import app from './app/app.reducer';
import indexPattern from './index-pattern/index-pattern.reducer';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern,
});
