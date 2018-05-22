import * as Rx from 'rxjs';
import { map, mapTo } from 'rxjs/operators';

/**
 *  Creates an Observable from a Process object that:
 *   - emits "exit", "SIGINT", or "SIGTERM" events that occur
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeSignals(process) {
  return Rx.merge(
    Rx.fromEvent(process, 'exit').pipe(map(([code]) => code), mapTo('exit')),
    Rx.fromEvent(process, 'SIGINT').pipe(mapTo('SIGINT')),
    Rx.fromEvent(process, 'SIGTERM').pipe(mapTo('SIGTERM'))
  );
}
