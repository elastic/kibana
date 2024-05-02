/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  schema.oneOf([
    schema.literal('available'),
    schema.literal('degraded'),
    schema.literal('unavailable'),
    schema.literal('critical'),
  ]);

const statusInfoServiceStatus: () => Type<
  Omit<ServiceStatus, 'level'> & { level: ServiceStatusLevelId }
> = () =>
  schema.object({
    level: serviceStatusLevelId(),
    summary: schema.string(),
    detail: schema.maybe(schema.string()),
    documentationUrl: schema.maybe(schema.string()),
    meta: schema.recordOf(schema.string(), schema.any()),
  });

const statusInfoCoreStatus: () => Type<StatusInfoCoreStatus> = () =>
  schema.object({
    elasticsearch: statusInfoServiceStatus(),
    savedObjects: statusInfoServiceStatus(),
  });

/** Only include a subset of fields for OAS documentation, for now */
const serverMetrics: () => Type<Partial<ServerMetrics>> = () =>
  schema.object({
    elasticsearch_client: schema.object({
      totalActiveSockets: schema.number(),
      totalIdleSockets: schema.number(),
      totalQueuedRequests: schema.number(),
    }),
    last_updated: schema.string(),
    collection_interval_in_millis: schema.number(),
  });

const buildFlavour: () => Type<BuildFlavor> = () =>
  schema.oneOf([schema.literal('serverless'), schema.literal('traditional')]);

const serverVersion: () => Type<ServerVersion> = () =>
  schema.object({
    number: schema.string(),
    build_hash: schema.string(),
    build_number: schema.number(),
    build_snapshot: schema.boolean(),
    build_flavor: buildFlavour(),
    build_date: schema.string(),
  });

const statusInfo: () => Type<StatusInfo> = () =>
  schema.object({
    overall: statusInfoServiceStatus(),
    core: statusInfoCoreStatus(),
    plugins: schema.recordOf(schema.string(), statusInfoServiceStatus()),
  });

/** Excluding metrics for brevity, for now */
const fullStatusResponse: () => Type<Omit<StatusResponse, 'metrics'>> = () =>
  schema.object(
    {
      name: schema.string(),
      uuid: schema.string(),
      version: serverVersion(),
      status: statusInfo(),
      metrics: serverMetrics(),
    },
    {
      meta: {
        id: 'core.status.response',
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
        id: 'core.status.redactedResponse',
      },
    }
  );

/** Lazily load this schema */
export const statusResponse = () =>
  schema.oneOf([redactedStatusResponse(), fullStatusResponse()], {
    meta: {
      description: `Kibana's operational status. A minimal response is sent for unauthorized users.`,
    },
  });

export type RedactedStatusHttpBody = TypeOf<typeof redactedStatusResponse>;
