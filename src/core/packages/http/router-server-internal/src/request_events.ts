/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import { defer, filter, first, fromEvent, NEVER, shareReplay } from 'rxjs';
import type { KibanaRequestEvents } from '@kbn/core-http-server';

class LazyKibanaRequestEvents implements KibanaRequestEvents {
  public readonly aborted$ = defer(() => this.getStreams().aborted$);
  public readonly completed$ = defer(() => this.getStreams().completed$);

  readonly #request: Request;
  #streams?: KibanaRequestEvents;

  constructor(request: Request) {
    this.#request = request;
  }

  private getStreams(): KibanaRequestEvents {
    if (this.#streams === undefined) {
      const completed$ = fromEvent<void>(this.#request.raw.res, 'close').pipe(
        shareReplay(1),
        first()
      );
      this.#streams = {
        aborted$: completed$.pipe(filter(() => !isCompleted(this.#request))),
        completed$,
      };
    }

    return this.#streams;
  }
}

export const createRequestEvents = (request?: Request): KibanaRequestEvents =>
  request === undefined
    ? {
        aborted$: NEVER,
        completed$: NEVER,
      }
    : new LazyKibanaRequestEvents(request);

const isCompleted = (request: Request): boolean => {
  const { res } = request.raw;
  // For http/1, it is sufficient to check `writableFinished` because `writableEnded` is always true when the response is finished.
  // For http/2, we need to check both `writableFinished` and `writableEnded` to be true to be sure the response is finished.
  // This allows Kibana's aborted$ event to be emitted when the client cancels the request, regardless of the protocol.
  // The addition of `writableEnded` works around inconsistencies in Node.js, which are resolved in Node.js 27+: https://github.com/nodejs/node/pull/63249
  return res.writableFinished && res.writableEnded;
};
