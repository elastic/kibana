import Rx from 'rxjs/Rx';

export const $timer = (...args) => (
  Rx.Observable.timer(...args)
);
