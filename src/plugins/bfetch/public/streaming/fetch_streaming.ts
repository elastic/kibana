/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, share } from 'rxjs/operators';
import { inflateResponse } from '.';
import { fromStreamingXhr } from './from_streaming_xhr';
import { split } from './split';
import { appendQueryParam } from '../../common';

export interface FetchStreamingParams {
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
  signal?: AbortSignal;
  getIsCompressionDisabled?: () => boolean;
}

/**
 * Sends an AJAX request to the server, and processes the result as a
 * streaming HTTP/1 response. Streams data as text through observable.
 */
export function fetchStreaming({
  url,
  headers = {},
  method = 'POST',
  body = '',
  signal,
  getIsCompressionDisabled = () => false,
}: FetchStreamingParams) {
  const xhr = new window.XMLHttpRequest();

  const isCompressionDisabled = getIsCompressionDisabled();
  if (!isCompressionDisabled) {
    url = appendQueryParam(url, 'compress', 'true');
  }

  // Begin the request
  xhr.open(method, url);
  xhr.withCredentials = true;

  // Set the HTTP headers
  Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

  const stream = fromStreamingXhr(xhr, signal);

  // Send the payload to the server
  xhr.send(body);

  // Return a stream of chunked decompressed messages
  const stream$ = stream.pipe(
    split('\n'),
    map((msg) => {
      return isCompressionDisabled ? msg : inflateResponse(msg);
    }),
    share()
  );

  return {
    xhr,
    stream: stream$,
  };
}
