/* eslint-disable */
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux'

import app from './app/app.reducer';
import indexPatternCreate from './store/reducers/index-pattern-creation';
import indexPatternList from './store/reducers/index-pattern-list';
import indexPatternView from './store/reducers/index-pattern-view';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern: combineReducers({
    indexPatternCreate,
    indexPatternList,
    indexPatternView,
  }),
});

export const getIndexPatternCreate = state => state.indexPattern.indexPatternCreate;
export const getIndexPatternList = state => state.indexPattern.indexPatternList;
export const getIndexPatternView = state => state.indexPattern.indexPatternView;
