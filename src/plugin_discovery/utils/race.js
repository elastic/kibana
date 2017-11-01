import Rx from 'rxjs/Rx';

export const $race = (...args) => (
  Rx.Observable.race(...args)
);
