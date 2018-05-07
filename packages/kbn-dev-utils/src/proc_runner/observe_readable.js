import Rx from 'rxjs';
import { first, ignoreElements, map } from 'rxjs/operators';

/**
 *  Produces an Observable from a ReadableSteam that:
 *   - completes on the first "end" event
 *   - fails on the first "error" event
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeReadable(readable) {
  return Rx.race(
    Rx.fromEvent(readable, 'end').pipe(first(), ignoreElements()),

    Rx.fromEvent(readable, 'error').pipe(
      first(),
      map(err => Rx.throwError(err))
    )
  );
}
