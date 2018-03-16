import Rx from 'rxjs/Rx';

import { createCliError } from './errors';

/**
 *  Creates an Observable from a childProcess that:
 *    - provides the exit code as it's only value (which may be null)
 *      as soon as the process exits
 *    - completes once all stdio streams for the child process have closed
 *    - fails if the childProcess emits an error event
 *
 *  @param  {ChildProcess} childProcess
 *  @return {Rx.Observable}
 */
export function observeChildProcess(name, childProcess) {
  // observe first exit event
  const exit$ = Rx.Observable.fromEvent(childProcess, 'exit')
    .first()
    .map(code => {
      // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat then as errors
      if (code > 0 && !(code === 143 || code === 130)) {
        throw createCliError(`[${name}] exitted with code ${code}`);
      }

      return code;
    });

  // observe first close event
  const close$ = Rx.Observable.fromEvent(childProcess, 'close').first();

  // observe first error event until there is a close event
  const error$ = Rx.Observable.fromEvent(childProcess, 'error')
    .first()
    .mergeMap(err => Rx.Observable.throw(err))
    .takeUntil(close$);

  return Rx.Observable.merge(exit$, close$.ignoreElements(), error$);
}
