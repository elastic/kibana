import Rx from 'rxjs/Rx';

export const $concat = (...args) => (
  Rx.Observable.$concat(...args)
);
