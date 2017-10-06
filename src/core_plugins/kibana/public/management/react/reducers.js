import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import { app } from './app/app.reducer';
import { indexPatternCreation } from './store/reducers/index-pattern-creation';
import { indexPatternList } from './store/reducers/index-pattern-list';
import { indexPatternView } from './store/reducers/index-pattern-view';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern: combineReducers({
    indexPatternCreation,
    indexPatternList,
    indexPatternView,
  }),
});

export const getIndexPatternCreation = state => state.indexPattern.indexPatternCreation;
export const getIndexPatternList = state => state.indexPattern.indexPatternList;
export const getIndexPatternView = state => state.indexPattern.indexPatternView;
