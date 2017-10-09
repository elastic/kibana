import { combineReducers } from 'redux';
import { dashboardState } from './dashboard/reducers';

/**
 * Only a single reducer now, but eventually there should be one for each sub app that is part of the
 * core kibana plugins.
 */
export const reducers = combineReducers({
  dashboardState
});

export const getDashboardState = state => state.dashboardState;
