import Rx from 'rxjs/Rx';

export const $from = (input) => (
  Rx.Observable.from(input)
);
