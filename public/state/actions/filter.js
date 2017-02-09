import { createAction } from 'redux-actions';

export const filterSet = (filterId, filter) => {
  return ({dispatch, getState}) => {
    console.log(filterId, filter);
  };
};

//export const filterSet = createAction('FILTER_SET');
