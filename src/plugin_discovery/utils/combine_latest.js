import Rx from 'rxjs/Rx';

export const $combineLatest = (...args) => (
  Rx.Observable.combineLatest(...args)
);
