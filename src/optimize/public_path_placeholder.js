import { createReplaceStream } from '../utils';

import Rx from 'rxjs/Rx';

const $fromEvent = Rx.Observable.fromEvent;

export const PUBLIC_PATH_PLACEHOLDER = '__REPLACE_WITH_PUBLIC_PATH__';

export function replacePlaceholder(read, replacement) {
  const replace = createReplaceStream(PUBLIC_PATH_PLACEHOLDER, replacement);

  // handle errors on the read stream by proxying them
  // to the replace stream so that the consumer can
  // choose what to do with them.
  $fromEvent(read, 'error')
    .take(1)
    .takeUntil($fromEvent(read, 'end'))
    .forEach(error => {
      replace.emit('error', error);
      replace.end();
    });

  replace.close = () => {
    read.unpipe();
    read.close();
  };

  return read.pipe(replace);
}
