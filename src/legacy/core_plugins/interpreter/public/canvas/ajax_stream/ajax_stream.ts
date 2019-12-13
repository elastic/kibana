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

import { once } from 'lodash';

/**
 * This file contains the client-side logic for processing a streaming AJAX response.
 * This allows things like request batching to process individual batch item results
 * as soon as the server sends them, instead of waiting for the entire response before
 * client-side processing can begin.
 *
 * The server sends responses in this format: {length}:{json}, for example:
 *
 * 18:{"hello":"world"}\n16:{"hello":"you"}\n
 */

// T is the response payload (the JSON), and we don't really
// care what it's type / shape is.
export type BatchResponseHandler<T> = (result: T) => void;

export interface BatchOpts<T> {
  url: string;
  onResponse: BatchResponseHandler<T>;
  method?: string;
  body?: string;
  headers?: { [k: string]: string };
}

// The subset of XMLHttpRequest that we use
export interface XMLHttpRequestLike {
  abort: () => void;
  onreadystatechange: any;
  onprogress: any;
  open: (method: string, url: string) => void;
  readyState: number;
  responseText: string;
  send: (body?: string) => void;
  setRequestHeader: (header: string, value: string) => void;
  status: number;
  withCredentials: boolean;
}

// Create a function which, when successively passed streaming response text,
// calls a handler callback with each response in the batch.
function processBatchResponseStream<T>(handler: BatchResponseHandler<T>) {
  let index = 0;

  return (text: string) => {
    // While there's text to process...
    while (index < text.length) {
      // We're using new line-delimited JSON.
      const delim = '\n';
      const delimIndex = text.indexOf(delim, index);

      // We've got an incomplete batch length
      if (delimIndex < 0) {
        return;
      }

      const payload = JSON.parse(text.slice(index, delimIndex));
      handler(payload);

      index = delimIndex + 1;
    }
  };
}

/**
 * Sends an AJAX request to the server, and processes the result as a
 * streaming HTTP/1 response.
 *
 * @param basePath - The Kibana basepath
 * @param defaultHeaders - The default HTTP headers to be sent with each request
 * @param req - The XMLHttpRequest
 * @param opts - The request options
 * @returns A promise which resolves when the entire batch response has been processed.
 */
export function ajaxStream<T>(
  basePath: string,
  defaultHeaders: { [k: string]: string },
  req: XMLHttpRequestLike,
  opts: BatchOpts<T>
) {
  return new Promise((resolve, reject) => {
    const { url, method, headers } = opts;

    // There are several paths by which the promise may resolve or reject. We wrap this
    // in "once" as a safeguard against cases where we attempt more than one call. (e.g.
    // a batch handler fails, so we reject the promise, but then new data comes in for
    // a subsequent batch item)
    const complete = once((err: Error | undefined = undefined) =>
      err ? reject(err) : resolve(req)
    );

    // Begin the request
    req.open(method || 'POST', `${basePath}/${url.replace(/^\//, '')}`);
    req.withCredentials = true;

    // Set the HTTP headers
    Object.entries(Object.assign({}, defaultHeaders, headers)).forEach(([k, v]) =>
      req.setRequestHeader(k, v)
    );

    const batchHandler = processBatchResponseStream(opts.onResponse);
    const processBatch = () => {
      try {
        batchHandler(req.responseText);
      } catch (err) {
        req.abort();
        complete(err);
      }
    };

    req.onprogress = processBatch;

    req.onreadystatechange = () => {
      // Older browsers don't support onprogress, so we need
      // to call this here, too. It's safe to call this multiple
      // times even for the same progress event.
      processBatch();

      // 4 is the magic number that means the request is done
      if (req.readyState === 4) {
        // 0 indicates a network failure. 400+ messages are considered server errors
        if (req.status === 0 || req.status >= 400) {
          complete(new Error(`Batch request failed with status ${req.status}`));
        } else {
          complete();
        }
      }
    };

    // Send the payload to the server
    req.send(opts.body);
  });
}
