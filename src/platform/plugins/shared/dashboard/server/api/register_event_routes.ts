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
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { IContentClient } from '@kbn/content-management-plugin/server/content_client';
import { CONTENT_ID, DashboardContentType } from '../../common/content_management';
import {
  PUBLIC_API_CONTENT_MANAGEMENT_VERSION,
  PUBLIC_API_PATH,
  PUBLIC_API_VERSION,
} from './constants';

export const registerEventRoutes = registerClientToClientEventRoutes;

// NOTE: uncomment this line to use the storage polling-based event system
// export const registerEventRoutes = registerStorageBasedEventRoutes;

/**
 * This function registers the routes for the storage based event system.
 *
 * The storage based event system publishes a notification to clients when a dashboard is updated.
 *
 * @param param0
 */
function registerStorageBasedEventRoutes({
  router,
  logger,
  contentManagement,
}: {
  router: VersionedRouter;
  logger: Logger;
  contentManagement: ContentManagementServerSetup;
}) {
  const dashboardEvents = new Map<string, Subject<ServerSentEvent>>();
  const dashboardVersions = new Map<string, string>();

  const getEventSubjectForDashboard = (id: string) => {
    let subject = dashboardEvents.get(id);
    if (!subject) {
      subject = new Subject<ServerSentEvent>();
      dashboardEvents.set(id, subject);
    }
    return subject;
  };

  let client: IContentClient<DashboardContentType>;

  // set up polling for dashboard changes
  setInterval(async () => {
    if (!client) {
      return;
    }

    const watchedDashboards = Array.from(dashboardEvents.keys());

    // can't use bulkGet because it isn't implemented for dashboards yet
    const dashboards = await Promise.all(
      watchedDashboards.map((id) => client.get(id).catch(() => ({ result: { item: {} } })))
    );

    for (const {
      result: { item },
    } of dashboards) {
      const newVersion = item.version;

      if (!dashboardVersions.has(item.id)) {
        dashboardVersions.set(item.id, newVersion);
      }

      if (newVersion !== dashboardVersions.get(item.id)) {
        const subject = getEventSubjectForDashboard(item.id);

        subject.next({
          type: 'event',
          event: 'dashboard.saved',
        });

        dashboardVersions.set(item.id, newVersion);
      }
    }
  }, 3000);

  const eventsRoute = router.get({
    path: `${PUBLIC_API_PATH}/{id}/events`,
    access: 'public',
    summary: `Subscribe to dashboard update events`,
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
    async (ctx, req, res) => {
      const { id } = req.params;
      const { source } = req.query;

      // here we're taking a client out of the request context
      // potentially problematic WRT security
      client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for(CONTENT_ID, PUBLIC_API_CONTENT_MANAGEMENT_VERSION);

      logger.info(`Fetched dashboard ${id}... checking for changes...`);

      const subject = getEventSubjectForDashboard(id);

      const controller = new AbortController();
      req.events.aborted$.subscribe(() => {
        controller.abort();
        // TODO: remove the subject and the version from the maps if this was the last client for this dashboard
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
