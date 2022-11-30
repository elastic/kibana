/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { streamFactory } from '@kbn/aiops-utils';

import {
  errorAction,
  reducerStreamRequestBodySchema,
  updateProgressAction,
  addToEntityAction,
  deleteEntityAction,
  ReducerStreamApiAction,
} from '../../common/api/reducer_stream';
import { API_ENDPOINT } from '../../common/api';

export const defineReducerStreamRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: API_ENDPOINT.REDUCER_STREAM,
      validate: {
        body: reducerStreamRequestBodySchema,
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
        request.body.compressResponse
      );

      const entities = [
        'kimchy',
        's1monw',
        'martijnvg',
        'jasontedor',
        'nik9000',
        'javanna',
        'rjernst',
        'jrodewig',
      ];

      const actions = [...Array(19).fill('add'), 'delete'];

      if (simulateError) {
        actions.push('throw-error');
        actions.push('emit-error');
      }

      let progress = 0;

      async function pushStreamUpdate() {
        setTimeout(() => {
          try {
            progress++;

            if (progress > 100 || shouldStop) {
              end();
              return;
            }

            push(updateProgressAction(progress));

            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            if (randomAction === 'add') {
              const randomCommits = Math.floor(Math.random() * 100);
              push(addToEntityAction(randomEntity, randomCommits));
            } else if (randomAction === 'delete') {
              push(deleteEntityAction(randomEntity));
            } else if (randomAction === 'throw-error') {
              // Throw an error. It should not crash Kibana!
              // It should be caught and logged to the Kibana server console.
              throw new Error('There was a (simulated) server side error!');
            } else if (randomAction === 'emit-error') {
              // Emit an error as a stream action.
              push(errorAction('(Simulated) error pushed to the stream'));
              return;
            }

            pushStreamUpdate();
          } catch (e) {
            logger.error(e);
          }
        }, Math.floor(Math.random() * maxTimeoutMs));
      }

      // do not call this using `await` so it will run asynchronously while we return the stream already.
      pushStreamUpdate();

      return response.ok(responseWithHeaders);
    }
  );
};
