import Rx from 'rxjs/Rx';

export const $fromPromise = (...args) => (
  Rx.Observable.fromPromise(...args)
);
