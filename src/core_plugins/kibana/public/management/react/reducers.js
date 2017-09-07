/* eslint-disable */
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux'

import app from './app/app.reducer';
import indexPatternCreate from './store/reducers/index-pattern-creation';
import indexPatternList from './store/reducers/index-pattern-list';
import transient from './store/reducers/transient';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern: combineReducers({
    indexPatternCreate,
    indexPatternList,
  }),
  transient,
});

export const getIndexPatternCreate = state => state.indexPattern.indexPatternCreate;
export const getIndexPatternList = state => state.indexPattern.indexPatternList;
export const getTransient = state => state.transient;
