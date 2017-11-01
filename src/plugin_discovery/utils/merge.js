import Rx from 'rxjs/Rx';

export const $merge = (...args) => (
  Rx.Observable.merge(...args)
);
