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
import { HttpServiceSetup } from '@kbn/core-http-server';
import {
  RequestHandlerContext,
  SECURITY_EXTENSION_ID,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { PUBLIC_API_PATH, PUBLIC_API_VERSION } from './constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../dashboard_saved_object';

// export const registerEventRoutes = registerClientToClientEventRoutes;

// NOTE: uncomment this line to use the storage polling-based event system
export const registerEventRoutes = registerStorageBasedEventRoutes;

/**
 * This function registers the routes for the storage based event system.
 *
 * The storage based event system publishes a notification to clients when a dashboard is updated.
 *
 * @param param0
 */
function registerStorageBasedEventRoutes({
  http,
  logger,
}: {
  http: HttpServiceSetup<RequestHandlerContext>;
  logger: Logger;
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

  let globalAccessClient: SavedObjectsClientContract;

  const schedulePoll = () => {
    const POLLING_INTERVAL = 3000;
    setTimeout(pollDashboardChanges, POLLING_INTERVAL);
  };

  const pollDashboardChanges = async () => {
    if (!globalAccessClient) {
      schedulePoll();
      return;
    }

    try {
      const watchedDashboards = Array.from(dashboardEvents.keys());

      if (!watchedDashboards.length) {
        schedulePoll();
        return;
      }

      const result = await globalAccessClient.bulkGet(
        watchedDashboards.map((id) => ({
          id,
          type: DASHBOARD_SAVED_OBJECT_TYPE,
          fields: [],
        }))
      );

      for (const dashboard of result.saved_objects) {
        if (!dashboard.version) {
          // TODO I don't think this should ever happen...
          continue;
        }

        const newVersion = dashboard.version;

        if (!dashboardVersions.has(dashboard.id)) {
          dashboardVersions.set(dashboard.id, newVersion);
        }

        if (newVersion !== dashboardVersions.get(dashboard.id)) {
          const subject = getEventSubjectForDashboard(dashboard.id);

          subject.next({
            type: 'event',
            event: 'dashboard.saved',
          });

          dashboardVersions.set(dashboard.id, newVersion);
        }
      }
    } catch (error) {
      logger.error(`Error during dashboard polling: ${error.message}`);
    }

    schedulePoll();
  };

  // Start the polling process
  pollDashboardChanges();

  const router = http.createRouter().versioned;

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
    async ({ core }, req, res) => {
      const coreRequestHandlerContext = await core;

      const { id } = req.params;
      const { source } = req.query;

      const localClient = coreRequestHandlerContext.savedObjects.getClient();
      try {
        // access check... we shouldn't allow users to subscribe to updates
        // for dashboards they don't have access to
        localClient.get(DASHBOARD_SAVED_OBJECT_TYPE, id);
      } catch (e) {
        return res.notFound();
      }

      if (!globalAccessClient) {
        // set up a global client for the polling system
        globalAccessClient = coreRequestHandlerContext.savedObjects.getClient({
          excludedExtensions: [SECURITY_EXTENSION_ID],
        });
      }

      // Now we're good to go. Set up an SSE stream for the client
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
  http,
  logger,
}: {
  http: HttpServiceSetup;
  logger: Logger;
}) {
  const router = http.createRouter().versioned;
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
