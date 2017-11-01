import Rx from 'rxjs/Rx';

export const $fromEvent = (...args) => (
  Rx.Observable.fromEvent(...args)
);
