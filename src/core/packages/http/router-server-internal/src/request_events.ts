/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import type { Request } from '@hapi/hapi';
import { filter, first, fromEvent, NEVER, shareReplay } from 'rxjs';
import type { KibanaRequestEvents } from '@kbn/core-http-server';

const fakeRequestEvents: KibanaRequestEvents = {
  aborted$: NEVER,
  completed$: NEVER,
};

class LazyKibanaRequestEvents implements KibanaRequestEvents {
  private streams?: KibanaRequestEvents;

  constructor(private readonly request: Request) {}

  public get aborted$(): KibanaRequestEvents['aborted$'] {
    return this.getStreams().aborted$;
  }

  public get completed$(): KibanaRequestEvents['completed$'] {
    return this.getStreams().completed$;
  }

  private getStreams(): KibanaRequestEvents {
    if (this.streams === undefined) {
      const completed$ = fromEvent<void>(this.request.raw.res, 'close').pipe(
        shareReplay(1),
        first()
      );
      this.streams = {
        aborted$: completed$.pipe(filter(() => !isCompleted(this.request))),
        completed$,
      };
    }

    return this.streams;
  }
}

export const createRequestEvents = (request?: Request): KibanaRequestEvents =>
  request === undefined ? fakeRequestEvents : new LazyKibanaRequestEvents(request);

const isCompleted = (request: Request): boolean => {
  const { res } = request.raw;
  // For http/1, it is sufficient to check `writableFinished` because `writableEnded` is always true when the response is finished.
  // For http/2, we need to check both `writableFinished` and `writableEnded` to be true to be sure the response is finished.
  // This allows Kibana's aborted$ event to be emitted when the client cancels the request, regardless of the protocol.
  // The addition of `writableEnded` works around inconsistencies in Node.js, which are resolved in Node.js 27+: https://github.com/nodejs/node/pull/63249
  return res.writableFinished && res.writableEnded;
};
