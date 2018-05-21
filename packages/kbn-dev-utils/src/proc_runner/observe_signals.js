import * as Rx from 'rxjs';
import { mapTo } from 'rxjs/operators';

/**
 *  Creates an Observable from a Process object that:
 *   - emits "exit", "SIGINT", or "SIGTERM" events that occur
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeSignals(process) {
  return Rx.merge(
    Rx.fromEvent(process, 'exit', x => x).pipe(mapTo('exit')),
    Rx.fromEvent(process, 'SIGINT', x => x).pipe(mapTo('SIGINT')),
    Rx.fromEvent(process, 'SIGTERM', x => x).pipe(mapTo('SIGTERM'))
  );
}
