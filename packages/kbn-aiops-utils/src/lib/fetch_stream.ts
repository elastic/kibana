/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReducerAction } from 'react';

import type { UseFetchStreamParamsDefault } from './use_fetch_stream';

type GeneratorError = string | undefined;

export async function* fetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  abortCtrl: React.MutableRefObject<AbortController>,
  body: I['body'],
  ndjson = true
): AsyncGenerator<
  [GeneratorError, ReducerAction<I['reducer']> | Array<ReducerAction<I['reducer']>> | undefined]
> {
  const stream = await fetch(endpoint, {
    signal: abortCtrl.current.signal,
    method: 'POST',
    headers: {
      // This refers to the format of the request body,
      // not the response, which will be a uint8array Buffer.
      'Content-Type': 'application/json',
      'kbn-xsrf': 'stream',
    },
    ...(Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
  });

  if (!stream.ok) {
    yield [`Error ${stream.status}: ${stream.statusText}`, undefined];
    return;
  }

  if (stream.body !== null) {
    // Note that Firefox 99 doesn't support `TextDecoderStream` yet.
    // That's why we skip it here and use `TextDecoder` later to decode each chunk.
    // Once Firefox supports it, we can use the following alternative:
    // const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
    const reader = stream.body.getReader();

    const bufferBounce = 100;
    let partial = '';
    let actionBuffer: Array<ReducerAction<I['reducer']>> = [];
    let lastCall = 0;

    while (true) {
      try {
        const { value: uint8array, done } = await reader.read();
        if (done) break;

        const value = new TextDecoder().decode(uint8array);

        const full = `${partial}${value}`;
        const parts = ndjson ? full.split('\n') : [full];
        const last = ndjson ? parts.pop() : '';

        partial = last ?? '';

        const actions = (ndjson ? parts.map((p) => JSON.parse(p)) : parts) as Array<
          ReducerAction<I['reducer']>
        >;
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          yield [undefined, actionBuffer];
          actionBuffer = [];
          lastCall = now;

          // In cases where the next chunk takes longer to be received than the `bufferBounce` timeout,
          // we trigger this client side timeout to clear a potential intermediate buffer state.
          // Since `yield` cannot be passed on to other scopes like callbacks,
          // this pattern using a Promise is used to wait for the timeout.
          yield new Promise<
            [
              GeneratorError,
              ReducerAction<I['reducer']> | Array<ReducerAction<I['reducer']>> | undefined
            ]
          >((resolve) => {
            setTimeout(() => {
              if (actionBuffer.length > 0) {
                resolve([undefined, actionBuffer]);
                actionBuffer = [];
                lastCall = now;
              } else {
                resolve([undefined, []]);
              }
            }, bufferBounce + 10);
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          yield [error.toString(), undefined];
        }
        break;
      }
    }

    // The reader might finish with a partially filled actionBuffer so
    // we need to clear it once more after the request is done.
    if (actionBuffer.length > 0) {
      yield [undefined, actionBuffer];
      actionBuffer.length = 0;
    }
  }
}
