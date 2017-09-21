import { createStore, applyMiddleware } from 'redux';
import { reducers } from './reducers';
import thunkMiddleware from 'redux-thunk';
import { getInitialState } from './dashboard/dashboard_store';

export const store = createStore(
  reducers,
  {
    dashboardState: getInitialState()
  },
  applyMiddleware(thunkMiddleware)
);
