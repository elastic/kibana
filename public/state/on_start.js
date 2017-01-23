import _ from 'lodash';
import {dataframeResolve} from './actions/dataframe';
import {elementResolve} from './actions/element';
import fetch from 'isomorphic-fetch';
import moment from 'moment';


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
  const safeSave = _.debounce(saveOnChange, 1000, {maxWait: 5000});

  resolveElements();
  resolveDataframes();
  store.subscribe(safeSave);

  function propDidChange(previousState, currentState, prop) {
    return (_.get(previousState, prop) !== _.get(currentState, prop));
  }

  let currentState;
  function saveOnChange() {
    let previousState = currentState;
    currentState = store.getState();
    if (!propDidChange(previousState, currentState, 'persistent')) return;

    const storable = Object.assign({}, currentState.persistent, {'@timestamp': moment().toISOString()});
    const timelionResp =  fetch('../api/rework/save', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'turdSandwich',
      },
      body: JSON.stringify(storable)
    })
    .then(resp => resp.json()).then(resp => {
      console.log(resp);
    });
  }

  function resolveDataframes() {
    const ids = _.keys(getState().persistent.dataframes);
    _.each(ids, id => dispatch(dataframeResolve(id)));
  }

  function resolveElements() {
    const ids = _.keys(getState().persistent.elements);
    _.each(ids, id => dispatch(elementResolve(id)));
  }

}
