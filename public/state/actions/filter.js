import { createAction } from 'redux-actions';
import {dataframeResolveAll} from './dataframe';
import _ from 'lodash';

export const filterSet = (filterId, filter) => {
  return (dispatch, getState) => {
    if (_.isUndefined(filter)) {
      const action = createAction('FILTER_REMOVE');
      dispatch(action(filterId));
    } else {
      const action = createAction('FILTER_SET');
      dispatch(action({...filter, id: filterId}));
    }
    dispatch(dataframeResolveAll());
  };
};

export const filterRemove = (filterId) => {
  return (dispatch, getState) => {
    if (!getState().persistent.filters[filterId]) return;
    else dispatch(filterSet(filterId));
  };
};
