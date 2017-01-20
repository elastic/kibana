import {argumentResolved} from './element';
import {createAction} from 'redux-actions';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import {mutateWithId} from './lib/helpers';

export const dataframeUnresolved = createAction('DATAFRAME_UNRESOLVED');
export const dataframeResolved = createAction('DATAFRAME_RESOLVED', mutateWithId);

export function dataframeSet(dataframe) {
  return (dispatch, getState) => {
    dispatch(dataframeUnresolved(dataframe));
    dispatch(dataframeResolve(dataframe.id));
  };
}

export function dataframeResolve(id) {
  return (dispatch, getState) => {
    const dataframe = getState().persistent.dataframes[id];
    const toDataframe = frameSources.byName[dataframe.type].toDataframe;
    Promise.resolve(toDataframe(dataframe.value))
      .then(resolvedFrame => dispatch(dataframeResolved(id, resolvedFrame)));
  };
};
