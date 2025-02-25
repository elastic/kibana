/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';

import { Subject, filter } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { VersionedRouter } from '@kbn/core-http-server';
import { PUBLIC_API_PATH, PUBLIC_API_VERSION } from './constants';

export const registerEventRoutes = registerClientToClientEventRoutes;

/**
 * This method registers the routes for the client to client event system.
 *
 * The client to client event system allows clients to publish and subscribe to events
 * that are specific to a dashboard.
 *
 * @param param0
 */
function registerClientToClientEventRoutes({
  router,
  logger,
}: {
  router: VersionedRouter;
  logger: Logger;
}) {
  const dashboardEvents = new Map<string, Subject<ServerSentEvent>>();

  const getEventSubjectForDashboard = (id: string) => {
    let subject = dashboardEvents.get(id);
    if (!subject) {
      subject = new Subject<ServerSentEvent>();
      dashboardEvents.set(id, subject);
    }
    return subject;
  };

  const publishEventRoute = router.post({
    path: `${PUBLIC_API_PATH}/{id}/events`,
    access: 'public',
    summary: `Publish dashboard events`,
  });

  publishEventRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
          body: schema.object({
            event: schema.string({
              meta: {
                description: 'The name of the event to publish.',
              },
            }),
            source: schema.string({
              meta: {
                description: "The client's identifier.",
              },
            }),
          }),
        },
      },
    },
    async (_ctx, req, res) => {
      const { id } = req.params;

      const subject = getEventSubjectForDashboard(id);

      subject.next({
        type: 'event',
        source: req.body.source,
        event: req.body.event,
      });

      return res.ok();
    }
  );

  const eventsRoute = router.get({
    path: `${PUBLIC_API_PATH}/{id}/events`,
    access: 'public',
    summary: `Subscribe to dashboard events`,
  });

  eventsRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'A unique identifier for the dashboard.',
              },
            }),
          }),
          query: schema.object({
            source: schema.string({
              meta: {
                description: "The client's identifier.",
              },
            }),
          }),
        },
      },
    },
    async (_ctx, req, res) => {
      const { id } = req.params;
      const { source } = req.query;

      const subject = getEventSubjectForDashboard(id);

      const controller = new AbortController();
      req.events.aborted$.subscribe(() => {
        controller.abort();
      });

      return res.ok({
        body: observableIntoEventSourceStream(
          subject.asObservable().pipe(filter((event) => event.source !== source)),
          {
            logger,
            signal: controller.signal,
          }
        ),
      });
    }
  );
}
