import Rx from 'rxjs/Rx';

const SEP = /\r?\n/;

import { observeReadable } from './observe_readable';

/**
 *  Creates an Observable from a Readable Stream that:
 *   - splits data from `readable` into lines
 *   - completes when `readable` emits "end"
 *   - fails if `readable` emits "errors"
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeLines(readable) {
  const done$ = observeReadable(readable).share();

  const scan$ = Rx.Observable
    .fromEvent(readable, 'data')
    .scan(({ buffer }, chunk) => {
      buffer += chunk;

      let match;
      const lines = [];
      while (match = buffer.match(SEP)) {
        lines.push(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
      }

      return { buffer, lines };
    }, { buffer: '' })
    // stop if done completes or errors
    .takeUntil(done$.materialize());

  return Rx.Observable.merge(
    // use done$ to provide completion/errors
    done$,

    // merge in the "lines" from each step
    scan$
      .mergeMap(({ lines }) => lines),

    // inject the "unsplit" data at the end
    scan$
      .last()
      .mergeMap(({ buffer }) => (buffer ? [buffer] : []))
      // if there were no lines, last() will error, so catch and complete
      .catch(() => Rx.Observable.empty())
  );
}
