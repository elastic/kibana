/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { ExampleRequestHandlerContext } from '../request_context';
import { EMIT_LOOP_ROUTE_PATH } from '../../common/constants';
import { LOOP_TRIGGER_ID } from '../../common/triggers/loop_trigger';

export { EMIT_LOOP_ROUTE_PATH };

export function registerEmitLoopRoute(router: IRouter<ExampleRequestHandlerContext>): void {
  router.post(
    {
      path: EMIT_LOOP_ROUTE_PATH,
      options: { access: 'public' },
      security: {
        authz: {
          enabled: false,
          reason: 'Example route for event-chain depth loop demo; not for production use.',
        },
      },
      validate: {
        body: schema.object({
          iteration: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const workflows = await context.workflows;
        const iteration = request.body.iteration ?? 0;
        await workflows.emitEvent(LOOP_TRIGGER_ID, { iteration });
        return response.ok({
          body: { ok: true, triggerId: LOOP_TRIGGER_ID, iteration },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return response.customError({
          statusCode: 500,
          body: { message },
        });
      }
    }
  );
}
