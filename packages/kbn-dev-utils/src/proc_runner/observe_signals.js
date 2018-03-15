import Rx from 'rxjs/Rx';

/**
 *  Creates an Observable from a Process object that:
 *   - emits "exit", "SIGINT", or "SIGTERM" events that occur
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeSignals(process) {
  return Rx.Observable.merge(
    Rx.Observable.fromEvent(process, 'exit').mapTo('exit'),
    Rx.Observable.fromEvent(process, 'SIGINT').mapTo('SIGINT'),
    Rx.Observable.fromEvent(process, 'SIGTERM').mapTo('SIGTERM'),
  );
}
