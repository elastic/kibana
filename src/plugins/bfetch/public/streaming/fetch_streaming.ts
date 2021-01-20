/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fromStreamingXhr } from './from_streaming_xhr';

export interface FetchStreamingParams {
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
  signal?: AbortSignal;
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
}: FetchStreamingParams) {
  const xhr = new window.XMLHttpRequest();

  // Begin the request
  xhr.open(method, url);
  xhr.withCredentials = true;

  // Set the HTTP headers
  Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

  const stream = fromStreamingXhr(xhr, signal);

  // Send the payload to the server
  xhr.send(body);

  return {
    xhr,
    stream,
  };
}
