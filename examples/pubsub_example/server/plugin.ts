/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { defineTopic } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { PingTopic } from '@kbn/pubsub-example-topic';

const pingTopic = defineTopic<PingTopic>('pubsubExample.ping');
const TIMER_INTERVAL_MS = 30_000;

export class PubSubExamplePlugin implements Plugin {
  private readonly logger: Logger;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('pubsub-example');
  }

  public setup(core: CoreSetup) {
    core.pubsub.registerTopic(pingTopic);
    core.pubsub.subscribe(pingTopic, {
      consumer: 'echo',
      handler: (event) => {
        this.logger.info(`echo ${event.id} from ${event.data.source}: ${event.data.message}`);
      },
    });
    core.pubsub.subscribe(pingTopic, {
      consumer: 'length',
      handler: (event) => {
        this.logger.info(`length ${event.id} ${event.data.message.length}`);
      },
    });

    const router = core.http.createRouter();
    router.versioned
      .post({
        path: '/internal/pubsub_example/publish',
        access: 'internal',
        security: {
          authz: AuthzDisabled.fromReason('This route is an example'),
        },
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: {
              body: schema.object({
                /** Stable per logical publish, so a retried call publishes the same event id. */
                idempotencyKey: schema.string({ minLength: 1, maxLength: 256 }),
                message: schema.string({ minLength: 1, maxLength: 1024 }),
              }),
            },
            response: {
              200: {
                body: () =>
                  schema.object({
                    id: schema.string({ minLength: 1, maxLength: 256 }),
                    acceptedAt: schema.string({ minLength: 1, maxLength: 64 }),
                  }),
              },
            },
          },
        },
        async (_context, request, response) => {
          const [start] = await core.getStartServices();
          const { id, acceptedAt } = await start.pubsub.publish(pingTopic, {
            id: request.body.idempotencyKey,
            data: { source: 'http', message: request.body.message },
          });

          return response.ok({ body: { id, acceptedAt } });
        }
      );
  }

  public start(core: CoreStart) {
    this.timer = setInterval(() => {
      void core.pubsub
        .publish(pingTopic, {
          id: `timer:${new Date().toISOString()}`,
          data: { source: 'timer', message: 'tick' },
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : 'unknown failure';
          this.logger.warn(`timer publish failed: ${detail}`);
        });
    }, TIMER_INTERVAL_MS);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
