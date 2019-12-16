/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defer } from '../../../kibana_utils/common';
import { fromStreamingXhr } from './from_streaming_xhr';

export interface FetchStreamingParams {
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
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
}: FetchStreamingParams) {
  const xhr = new window.XMLHttpRequest();
  const { promise, resolve, reject } = defer<void>();

  // Begin the request
  xhr.open(method, url);
  xhr.withCredentials = true;

  // Set the HTTP headers
  Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

  const stream = fromStreamingXhr(xhr);

  stream.subscribe({
    complete: () => resolve(),
    error: error => reject(error),
  });

  // Send the payload to the server
  xhr.send(body);

  return {
    xhr,
    promise,
    stream,
  };
}
