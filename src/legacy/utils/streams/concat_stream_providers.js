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

import { PassThrough } from 'stream';

/**
 *  Write the data and errors from a list of stream providers
 *  to a single stream in order. Stream providers are only
 *  called right before they will be consumed, and only one
 *  provider will be active at a time.
 *
 *  @param {Array<() => ReadableStream>} sourceProviders
 *  @param {PassThroughOptions} options options passed to the PassThrough constructor
 *  @return {WritableStream} combined stream
 */
export function concatStreamProviders(sourceProviders, options = {}) {
  const destination = new PassThrough(options);
  const queue = sourceProviders.slice();

  (function pipeNext() {
    const provider = queue.shift();

    if (!provider) {
      return;
    }

    const source = provider();
    const isLast = !queue.length;

    // if there are more sources to pipe, hook
    // into the source completion
    if (!isLast) {
      source.once('end', pipeNext);
    }

    source
      // proxy errors from the source to the destination
      .once('error', (error) => destination.emit('error', error))
      // pipe the source to the destination but only proxy the
      // end event if this is the last source
      .pipe(destination, { end: isLast });
  })();

  return destination;
}
