import Rx from 'rxjs/Rx';

/**
 *  Produces an Observable from a ReadableSteam that:
 *   - completes on the first "end" event
 *   - fails on the first "error" event
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeReadable(readable) {
  return Rx.Observable
    .race(
      Rx.Observable
        .fromEvent(readable, 'end')
        .first()
        .ignoreElements(),

      Rx.Observable
        .fromEvent(readable, 'error')
        .first()
        .map(err => Rx.Observable.throw(err))
    );
}
