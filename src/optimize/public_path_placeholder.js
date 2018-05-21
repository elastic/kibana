import { createReplaceStream } from '../utils';

import * as Rx from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

export const PUBLIC_PATH_PLACEHOLDER = '__REPLACE_WITH_PUBLIC_PATH__';

export function replacePlaceholder(read, replacement) {
  const replace = createReplaceStream(PUBLIC_PATH_PLACEHOLDER, replacement);

  // handle errors on the read stream by proxying them
  // to the replace stream so that the consumer can
  // choose what to do with them.
  Rx.fromEvent(read, 'error', x => x).pipe(
    take(1),
    takeUntil(Rx.fromEvent(read, 'end', x => x))
  )
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
