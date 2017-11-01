import Rx from 'rxjs/Rx';

export const $create = (block) => (
  Rx.Observable.create(block)
);
