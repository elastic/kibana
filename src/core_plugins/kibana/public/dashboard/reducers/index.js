import { combineReducers } from 'redux';
import { panels } from './panels';
import { view } from './view';

export const dashboardState = combineReducers({
  view,
  panels
});
