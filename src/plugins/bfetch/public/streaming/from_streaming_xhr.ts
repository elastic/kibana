/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subject } from 'rxjs';

/**
 * Creates observable from streaming XMLHttpRequest, where each event
 * corresponds to a streamed chunk.
 */
export const fromStreamingXhr = (
  xhr: Pick<
    XMLHttpRequest,
    'onprogress' | 'onreadystatechange' | 'readyState' | 'status' | 'responseText' | 'abort'
  >,
  signal?: AbortSignal
): Observable<string> => {
  const subject = new Subject<string>();
  let index = 0;
  let aborted = false;

  // 0 indicates a network failure. 400+ messages are considered server errors
  const isErrorStatus = () => xhr.status === 0 || xhr.status >= 400;

  const processBatch = () => {
    if (aborted) return;
    if (isErrorStatus()) return;

    const { responseText } = xhr;
    if (index >= responseText.length) return;
    subject.next(responseText.substr(index));
    index = responseText.length;
  };

  xhr.onprogress = processBatch;

  const onBatchAbort = () => {
    if (xhr.readyState !== 4) {
      aborted = true;
      xhr.abort();
      subject.complete();
      if (signal) signal.removeEventListener('abort', onBatchAbort);
    }
  };

  if (signal) signal.addEventListener('abort', onBatchAbort);

  xhr.onreadystatechange = () => {
    if (aborted) return;
    // Older browsers don't support onprogress, so we need
    // to call this here, too. It's safe to call this multiple
    // times even for the same progress event.
    processBatch();

    // 4 is the magic number that means the request is done
    if (xhr.readyState === 4) {
      if (signal) signal.removeEventListener('abort', onBatchAbort);

      if (isErrorStatus()) {
        subject.error(new Error(`Batch request failed with status ${xhr.status}`));
      } else {
        subject.complete();
      }
    }
  };

  return subject;
};
