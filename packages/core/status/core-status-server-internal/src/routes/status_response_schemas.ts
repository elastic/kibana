/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type Type, type TypeOf } from '@kbn/config-schema';
import type { BuildFlavor } from '@kbn/config';
import type { ServiceStatusLevelId, ServiceStatus } from '@kbn/core-status-common';

import type {
  StatusResponse,
  StatusInfoCoreStatus,
  ServerMetrics,
  StatusInfo,
  ServerVersion,
} from '@kbn/core-status-common-internal';

const serviceStatusLevelId: () => Type<ServiceStatusLevelId> = () =>
  schema.oneOf(
    [
      schema.literal('available'),
      schema.literal('degraded'),
      schema.literal('unavailable'),
      schema.literal('critical'),
    ],
    { meta: { description: 'Service status levels as human and machine readable values.' } }
  );

const statusInfoServiceStatus: () => Type<
  Omit<ServiceStatus, 'level'> & { level: ServiceStatusLevelId }
> = () =>
  schema.object({
    level: serviceStatusLevelId(),
    summary: schema.string({
      meta: { description: 'A human readable summary of the service status.' },
    }),
    detail: schema.maybe(
      schema.string({ meta: { description: 'Human readable detail of the service status.' } })
    ),
    documentationUrl: schema.maybe(
      schema.string({
        meta: { description: 'A URL to further documentation regarding this service.' },
      })
    ),
    meta: schema.recordOf(schema.string(), schema.any(), {
      meta: { description: 'An unstructured set of extra metadata about this service.' },
    }),
  });

const statusInfoCoreStatus: () => Type<StatusInfoCoreStatus> = () =>
  schema.object(
    {
      elasticsearch: statusInfoServiceStatus(),
      savedObjects: statusInfoServiceStatus(),
    },
    { meta: { description: 'Statuses of core Kibana services.' } }
  );

/** Only include a subset of fields for OAS documentation, for now */
const serverMetrics: () => Type<Partial<ServerMetrics>> = () =>
  schema.object(
    {
      elasticsearch_client: schema.object(
        {
          totalActiveSockets: schema.number({
            meta: { description: 'Count of network sockets currently in use.' },
          }),
          totalIdleSockets: schema.number({
            meta: { description: 'Count of network sockets currently idle.' },
          }),
          totalQueuedRequests: schema.number({
            meta: { description: 'Count of requests not yet assigned to sockets.' },
          }),
        },
        { meta: { description: `Current network metrics of Kibana's Elasticsearch client.` } }
      ),
      last_updated: schema.string({ meta: { description: 'The time metrics were collected.' } }),
      collection_interval_in_millis: schema.number({
        meta: { description: 'The interval at which metrics should be collected.' },
      }),
    },
    {
      meta: {
        description: 'Metric groups collected by Kibana.',
      },
    }
  );

const buildFlavour: () => Type<BuildFlavor> = () =>
  schema.oneOf([schema.literal('serverless'), schema.literal('traditional')], {
    meta: {
      description:
        'The build flavour determines configuration and behavior of Kibana. On premise users will almost always run the "traditional" flavour, while other flavours are reserved for Elastic-specific use cases.',
    },
  });

const serverVersion: () => Type<ServerVersion> = () =>
  schema.object({
    number: schema.string({
      meta: { description: 'A semantic version number.' },
    }),
    build_hash: schema.string({
      meta: {
        description: 'A unique hash value representing the git commit of this Kibana build.',
      },
    }),
    build_number: schema.number({
      meta: {
        description:
          'A monotonically increasing number, each subsequent build will have a higher number.',
      },
    }),
    build_snapshot: schema.boolean({
      meta: { description: 'Whether this build is a snapshot build.' },
    }),
    build_flavor: buildFlavour(),
    build_date: schema.string({ meta: { description: 'The date and time of this build.' } }),
  });

const statusInfo: () => Type<StatusInfo> = () =>
  schema.object({
    overall: statusInfoServiceStatus(),
    core: statusInfoCoreStatus(),
    plugins: schema.recordOf(schema.string(), statusInfoServiceStatus(), {
      meta: { description: 'A dynamic mapping of plugin ID to plugin status.' },
    }),
  });

/** Excluding metrics for brevity, for now */
const fullStatusResponse: () => Type<Omit<StatusResponse, 'metrics'>> = () =>
  schema.object(
    {
      name: schema.string({ meta: { description: 'Kibana instance name.' } }),
      uuid: schema.string({
        meta: {
          description:
            'Unique, generated Kibana instance UUID. This UUID should persist even if the Kibana process restarts.',
        },
      }),
      version: serverVersion(),
      status: statusInfo(),
      metrics: serverMetrics(),
    },
    {
      meta: {
        id: 'core_status_response',
        description: `Kibana's operational status as well as a detailed breakdown of plugin statuses indication of various loads (like event loop utilization and network traffic) at time of request.`,
      },
    }
  );

const redactedStatusResponse = () =>
  schema.object(
    {
      status: schema.object({
        overall: schema.object({
          level: serviceStatusLevelId(),
        }),
      }),
    },
    {
      meta: {
        id: 'core_status_redactedResponse',
        description: `A minimal representation of Kibana's operational status.`,
      },
    }
  );

/** Lazily load this schema */
export const statusResponse = () =>
  schema.oneOf([fullStatusResponse(), redactedStatusResponse()], {
    meta: {
      description: `Kibana's operational status. A minimal response is sent for unauthorized users.`,
    },
  });

export type RedactedStatusHttpBody = TypeOf<typeof redactedStatusResponse>;
