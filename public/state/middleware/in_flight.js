import { toPath } from 'lodash';
import { setLoading, setValue, inFlightActive, inFlightComplete } from '../actions/resolved_args';

export const inFlight = ({ dispatch }) => (next) => {
  const pendingCache = [];

  // TODO: this timer is tracked so we can hide the spinner when things fail
  // it's an ugly way to handle things, but it'll work for now
  let clearTimer = () => {};
  function createTimer(time = 10000) {
    clearTimer(); // clear any pending timers

    const timer = setTimeout(() => {
      dispatch(inFlightComplete());
      pendingCache.splice(0, pendingCache.length); // clear the pending cache
    }, time);

    clearTimer = () => clearTimeout(timer);
  }

  return action => {
    const isLoading = action.type === setLoading.toString();
    const isSetting = action.type === setValue.toString();

    if (isLoading || isSetting) {
      const cacheKey = toPath(action.payload.path).join('/');

      if (isLoading) {
        pendingCache.push(cacheKey);
        dispatch(inFlightActive());

        createTimer(); // create loading timeout
      } else if (isSetting) {
        const idx = pendingCache.indexOf(cacheKey);
        pendingCache.splice(idx, 1);
        if (pendingCache.length === 0) {
          clearTimer();
          dispatch(inFlightComplete());
        }
      }
    }

    // execute the action
    next(action);
  };
};
