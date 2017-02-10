import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import moment from 'moment';
import { workpadInit } from './actions/workpad';
import { toJson } from 'plugins/rework/lib/resolve_fetch';

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
  let currentState;
  const safeSave = _.debounce(saveOnChange, 1000, {
    leading: true,
    maxWait: 5000
  });

  function propDidChange(previousState, currentState, prop) {
    return (_.get(previousState, prop) !== _.get(currentState, prop));
  }

  function saveOnChange() {
    let previousState = currentState;
    currentState = store.getState();
    if (!propDidChange(previousState, currentState, 'persistent')) return;

    savePersistedState(currentState);
  }

  store.dispatch(workpadInit());
  store.subscribe(safeSave);
}

function savePersistedState(newState) {
  console.log('savePersistedState')
  const storable = {
    ...newState.persistent,
    '@timestamp': moment().toISOString()
  };

  return fetch('../api/rework/save', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'kbn-xsrf': 'turdSandwich',
    },
    body: JSON.stringify(storable)
  })
  .then(toJson())
  .then(() => console.log('save complete'))
  .catch(err => {
    // TODO: tell the user that save failed
    console.log('SAVE FAILED', err);
  });
}