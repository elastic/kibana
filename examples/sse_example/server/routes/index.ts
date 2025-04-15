/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { Observable, defer, map, timer } from 'rxjs';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { ServerSentEvent } from '@kbn/sse-utils/src/events';

export function defineRoutes(router: IRouter, logger: Logger) {
  router.versioned
    .get({
      path: '/internal/sse_examples/clock',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out of authorization since it is an example sse route',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const events$: Observable<ServerSentEvent> = defer(() => timer(0, 1000)).pipe(
          map(() => ({ type: 'clock', message: `Hi! It's ${new Date().toLocaleTimeString()}!` }))
        );

        return response.ok({
          headers: {
            'Content-Type': 'text/event-stream',
          },
          body: observableIntoEventSourceStream(events$, {
            signal: abortController.signal,
            logger,
          }),
        });
      }
    );
}
