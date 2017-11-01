import Rx from 'rxjs/Rx';

export const $defer = (...args) => (
  Rx.Observable.defer(...args)
);
