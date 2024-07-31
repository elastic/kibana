/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { streamFactory } from '@kbn/ml-response-stream/server';

import {
  errorAction,
  updateProgressAction,
  addToEntityAction,
  deleteEntityAction,
  ReducerStreamApiAction,
} from '../../common/api/reducer_stream/reducer_actions';
import { reducerStreamRequestBodySchema } from './schemas/reducer_stream';
import { RESPONSE_STREAM_API_ENDPOINT } from '../../common/api';

import { entities, getActions } from './shared';

export const defineReducerStreamRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .post({
      path: RESPONSE_STREAM_API_ENDPOINT.REDUCER_STREAM,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: reducerStreamRequestBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const maxTimeoutMs = request.body.timeout ?? 250;
        const simulateError = request.body.simulateErrors ?? false;

        let logMessageCounter = 1;

        function logDebugMessage(msg: string) {
          logger.debug(`Response Stream Example #${logMessageCounter}: ${msg}`);
          logMessageCounter++;
        }

        logDebugMessage('Starting stream.');

        let shouldStop = false;
        request.events.aborted$.subscribe(() => {
          logDebugMessage('aborted$ subscription trigger.');
          shouldStop = true;
        });
        request.events.completed$.subscribe(() => {
          logDebugMessage('completed$ subscription trigger.');
          shouldStop = true;
        });

        const { end, push, responseWithHeaders } = streamFactory<ReducerStreamApiAction>(
          request.headers,
          logger,
          request.body.compressResponse,
          request.body.flushFix
        );

        const actions = getActions(simulateError);

        let progress = 0;

        async function pushStreamUpdate() {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.floor(Math.random() * maxTimeoutMs))
          );
          try {
            progress++;

            if (progress > 100 || shouldStop) {
              end();
              return;
            }

            push(updateProgressAction(progress));

            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            switch (randomAction) {
              case 'add':
                const randomCommits = Math.floor(Math.random() * 100);
                push(addToEntityAction(randomEntity, randomCommits));
                break;

              case 'delete':
                push(deleteEntityAction(randomEntity));
                break;

              case 'throw-error':
                // Throw an error. It should not crash Kibana!
                // It should be caught and logged to the Kibana server console.
                // The stream will just stop but the client will note receive an error!
                // In practice this pattern should be avoided as it will just end
                // the stream without an explanation.
                throw new Error('There was a (simulated) server side error!');

              case 'emit-error':
                // Emit an error as a stream action.
                push(errorAction('(Simulated) error pushed to the stream'));
                return;
            }

            void pushStreamUpdate();
          } catch (e) {
            logger.error(e);
          }
        }

        // do not call this using `await` so it will run asynchronously while we return the stream already.
        void pushStreamUpdate();

        return response.ok(responseWithHeaders);
      }
    );
};
