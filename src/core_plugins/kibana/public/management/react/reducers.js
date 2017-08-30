/* eslint-disable */
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux'

import app from './app/app.reducer';
import indexPatternCreate from './store/reducers/index-pattern-creation';
// import indexPatternList from './index-pattern/components/index-pattern-list/index-pattern-list.reducer';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern: combineReducers({
    indexPatternCreate,
    // indexPatternList,
  }),
});

export const getIndexPatternCreate = state => state.indexPattern.indexPatternCreate;
