import { createAction } from 'redux-actions';
import {dataframeResolveAll} from './dataframe';

export const filterSet = (filterId, filter) => {
  return (dispatch, getState) => {
    const action = createAction('FILTER_SET');
    dispatch(action({...filter, id: filterId}));
    dispatch(dataframeResolveAll());
  };
};

//export const filterSet = createAction('FILTER_SET');
