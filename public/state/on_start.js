import _ from 'lodash';
import {dataframeResolve} from './actions/dataframe';
import {elementResolve} from './actions/element';



// Stuff todo when you bootstrap the store
export default function (store) {
  const {getState, dispatch} = store;

  resolveElements();
  resolveDataframes();

  function resolveDataframes() {
    const ids = _.keys(getState().persistent.dataframes);
    _.each(ids, id => dispatch(dataframeResolve(id)));
  }

  function resolveElements() {
    const ids = _.keys(getState().persistent.elements);
    _.each(ids, id => dispatch(elementResolve(id)));
  }

}
