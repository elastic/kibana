import _ from 'lodash';
import {dataframeResolve} from './actions/dataframe';
import {elementResolve} from './actions/element';


/*
POST /.kibana/the_rework_1/_mapping

{
  "properties": {
    "pages": {
      "type": "object",
      "enabled": false
    },
    "elements": {
      "type": "object",
      "enabled": false
    },
    "dataframes": {
      "type": "object",
      "enabled": false

    }
  }
}
*/

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
