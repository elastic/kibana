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
import { EMIT_EVENT_ROUTE_PATH } from '../../common/constants';
import { CUSTOM_TRIGGER_ID } from '../../common/triggers/custom_trigger';

export { EMIT_EVENT_ROUTE_PATH };

export function registerEmitEventRoute(router: IRouter<ExampleRequestHandlerContext>): void {
  router.post(
    {
      path: EMIT_EVENT_ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'Example route for demonstrating emitEvent; not for production use.',
        },
      },
      validate: {
        body: schema.object({
          message: schema.string(),
          source: schema.maybe(schema.string()),
          category: schema.maybe(schema.string()),
          foo: schema.maybe(
            schema.object({
              bar: schema.object({
                baz: schema.string(),
              }),
            })
          ),
          another: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const workflows = await context.workflows;
        const client = workflows.getWorkflowsClient();
        await client.emitEvent(CUSTOM_TRIGGER_ID, {
          message: request.body.message,
          ...(request.body.source !== undefined && { source: request.body.source }),
          ...(request.body.category !== undefined && { category: request.body.category }),
          ...(request.body.foo !== undefined && { foo: request.body.foo }),
          another: request.body.another,
        });
        return response.ok({
          body: { ok: true, triggerId: CUSTOM_TRIGGER_ID },
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
