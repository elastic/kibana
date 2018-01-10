import { applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import persistState from 'redux-localstorage';
import lzString from 'lz-string';
import { getWindow } from '../../lib/get_window';
import { esPersistMiddleware } from './es_persist';
import { historyMiddleware } from './history';
import { inFlight } from './in_flight';
import { workpadUpdate } from './workpad_update';
import { workpadRefresh } from './workpad_refresh';
import { appReady } from './app_ready';

const storageKey = 'canvas';

// caching serializer, prevents lzString.compress from running all the time
const serializer = (function() {
  let prevString;
  let prevState;
  return state => {
    const newString = JSON.stringify(state);

    // state changed, recompress and cache the value
    if (newString !== prevString) {
      prevState = lzString.compress(newString);
    }

    // cache the stringified value for comparison next time
    prevString = newString;
    return prevState;
  };
})();

const middlewares = [
  applyMiddleware(
    thunkMiddleware,
    esPersistMiddleware,
    historyMiddleware(getWindow()),
    inFlight,
    appReady,
    workpadUpdate,
    workpadRefresh
  ),
  persistState('persistent', { key: storageKey }),
  persistState('assets', {
    key: `${storageKey}-assets`,
    serialize: serializer,
    deserialize: state => JSON.parse(lzString.decompress(state || '')),
  }),
];

if (getWindow().__REDUX_DEVTOOLS_EXTENSION__)
  middlewares.push(getWindow().__REDUX_DEVTOOLS_EXTENSION__());

export const middleware = compose(...middlewares);
