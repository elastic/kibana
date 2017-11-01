import Rx from 'rxjs/Rx';

export const $of = (...args) => (
  Rx.Observable.of(...args)
);
