import Rx from 'rxjs/Rx';

export const $throw = (...args) => (
  Rx.Observable.throw(...args)
);
