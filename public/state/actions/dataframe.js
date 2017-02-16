import _ from 'lodash';
import { argumentResolve, elementRemoveSlowly, elementResolveAll } from './element';
import { createAction } from 'redux-actions';

import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import elementTypes from 'plugins/rework/elements/elements';
import { mutateWithId } from 'plugins/rework/state/lib/mutation_helpers';
import { getDataframeTemplate } from '../templates';

export const dataframeUnresolved = createAction('DATAFRAME_UNRESOLVED');
export const dataframeResolved = createAction('DATAFRAME_RESOLVED', mutateWithId);

export const dataframeSelect = createAction('DATAFRAME_SELECT');
export const dataframeCreate = createAction('DATAFRAME_CREATE');

export function dataframeDuplicate(id) {
  return (dispatch, getState) => {
    const { dataframes } = getState().persistent;
    const dataframe = dataframes[id] ? _.cloneDeep(dataframes[id]) : false;

    // TODO: handle missing id error
    if (!dataframe) return;

    // remove the id and update the name
    dataframe.name = dataframe.name + ' COPY';
    delete dataframe.id;

    dispatch(dataframeAdd(dataframe));
  };
}

export function dataframeSet(dataframe) {
  return (dispatch, getState) => {
    dispatch(dataframeUnresolved(dataframe));
    dispatch(dataframeResolve(dataframe.id));

    // TODO: Move this to dataframe resolve somehow. Basically we need a way for this to not fire at
    // startup, but to fire any other time, including when the refresh button is hit
    dispatch(dataframeSync(dataframe.id));
  };
}

export function dataframeResolveAll() {
  return (dispatch, getState) => {
    const ids = _.keys(getState().persistent.dataframes);
    _.each(ids, id => dispatch(dataframeResolve(id)));
    dispatch(elementResolveAll());
  };
}

export function dataframeAdd(dataframe) {
  return (dispatch, getState) => {
    const newFrame = _.assign({}, getDataframeTemplate(), dataframe);
    dispatch(dataframeSelect(newFrame.id));
    dispatch(dataframeSet(newFrame));
  };
}

export function dataframeResolve(id) {
  return (dispatch, getState) => {
    // TODO: Wire this up to be actual filters.
    const time = getState().persistent.workpad.time;
    const filters = {
      ...getState().persistent.filters,
      'filter-globalTimeFilter': {
        id: 'filter-globalTimeFilter',
        type: 'time',
        value: time
      }
    };
    const dataframe = getState().persistent.dataframes[id];
    const toDataframe = frameSources.byName[dataframe.type].toDataframe;
    dispatch(dataframeResolved(id, Promise.resolve(toDataframe(dataframe.value, filters))));
  };
};

export function dataframeRemove(id) {
  return (dispatch) => {
    const msg = 'You are about to remove this dataframe.\n\n' +
      'This will also remove all of the associated elements on all pages.\n\n' +
      'You can use the undo button to restore it.';

    if (window.confirm(msg)) {
      const action = createAction('DATAFRAME_REMOVE');
      dispatch(dataframeRemoveLinkedElements(id));
      dispatch(action(id));
    }
  };
}

// TODO: This is really bad. It loops over every element, and every argument
// to check if any of them use the dataframe in question, and if so, resolves the
// argument. There has to be a better way to keep these things in sync.
function dataframeSync(id) {
  return (dispatch, getState) => {
    //dispatch(elementResolveAll());
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

// TODO: Also really bad, since elementRemoveSlowly also loops over every page.
// We're basically looping over everything EVER. Kill me now.
function dataframeRemoveLinkedElements(id) {
  return (dispatch, getState) => {
    const elements = getState().persistent.elements;
    _.each(elements, element => {
      const elementType = elementTypes.byName[element.type];
      _.each(elementType.args, arg => {
        if (arg.type.name !== 'dataframe') return;
        if (element.args[arg.name] !== id) return;
        dispatch(elementRemoveSlowly(element.id));
      });
    });
  };
}
