import {argumentResolve} from './element';
import {createAction} from 'redux-actions';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import {mutateWithId} from './lib/helpers';
import { getDataframeTemplate } from '../templates';

import elementTypes from 'plugins/rework/elements/elements';
import _ from 'lodash';


export const dataframeUnresolved = createAction('DATAFRAME_UNRESOLVED');
export const dataframeResolved = createAction('DATAFRAME_RESOLVED', mutateWithId);

export function dataframeSet(dataframe) {
  return (dispatch, getState) => {
    dispatch(dataframeUnresolved(dataframe));
    dispatch(dataframeResolve(dataframe.id));
  };
}

export function dataframeResolveAll() {
  return (dispatch, getState) => {
    const ids = _.keys(getState().persistent.dataframes);
    _.each(ids, id => dispatch(dataframeResolve(id)));
  };
}

export function dataframeAdd(dataframe) {
  return (dispatch, getState) => {
    const newFrame = _.assign({}, getDataframeTemplate(), dataframe);
    dispatch(dataframeSet(newFrame));
  };
}

export function dataframeResolve(id) {
  return (dispatch, getState) => {
    const dataframe = getState().persistent.dataframes[id];
    const toDataframe = frameSources.byName[dataframe.type].toDataframe;
    Promise.resolve(toDataframe(dataframe.value))
      .then(resolvedFrame => {
        dispatch(dataframeResolved(id, resolvedFrame));
        dispatch(dataframeSync(id));
      });
  };
};

// TODO: This is really bad. It loops over every element, and every argument
// to check if any of them use the dataframe in question, and if so, resolves the
// argument. There has to be a better way to keep these things in sync.
function dataframeSync(id) {
  return (dispatch, getState) => {
    const elements = getState().persistent.elements;
    _.each(elements, element => {
      const elementType = elementTypes.byName[element.type];
      _.each(elementType.args, arg => {
        if (arg.type.name !== 'dataframe') return;
        if (element.args[arg.name] !== id) return;
        dispatch(argumentResolve(element.id, arg.name));
      });
    });
  };
}
