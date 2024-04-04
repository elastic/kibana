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

export const serviceStatusLevelId: Type<ServiceStatusLevelId> = schema.oneOf([
  schema.literal('available'),
  schema.literal('degraded'),
  schema.literal('unavailable'),
  schema.literal('critical'),
]);

export const statusInfoServiceStatus: Type<
  Omit<ServiceStatus, 'level'> & { level: ServiceStatusLevelId }
> = schema.object({
  level: serviceStatusLevelId,
  summary: schema.string(),
  detail: schema.maybe(schema.string()),
  documentationUrl: schema.maybe(schema.string()),
  meta: schema.recordOf(schema.string(), schema.any()),
});

export const statusInfoCoreStatus: Type<StatusInfoCoreStatus> = schema.object({
  elasticsearch: statusInfoServiceStatus,
  savedObjects: statusInfoServiceStatus,
});

/** Only include a subset of fields for OAS documentation, for now */
export const serverMetrics: Type<Partial<ServerMetrics>> = schema.object({
  elasticsearch_client: schema.object({
    totalActiveSockets: schema.number(),
    totalIdleSockets: schema.number(),
    totalQueuedRequests: schema.number(),
  }),
  last_updated: schema.string(),
  collection_interval_in_millis: schema.number(),
});

export const buildFlavour: Type<BuildFlavor> = schema.oneOf([
  schema.literal('serverless'),
  schema.literal('traditional'),
]);
export const serverVersion: Type<ServerVersion> = schema.object({
  number: schema.string(),
  build_hash: schema.string(),
  build_number: schema.number(),
  build_snapshot: schema.boolean(),
  build_flavor: buildFlavour,
  build_date: schema.string(),
});

export const statusInfo: Type<StatusInfo> = schema.object({
  overall: statusInfoServiceStatus,
  core: statusInfoCoreStatus,
  plugins: schema.recordOf(schema.string(), statusInfoServiceStatus),
});

/** Excluding metrics for brevity, for now */
export const statusResponse: Type<Omit<StatusResponse, 'metrics'>> = schema.object(
  {
    name: schema.string(),
    uuid: schema.string(),
    version: serverVersion,
    status: statusInfo,
    metrics: serverMetrics,
  },
  { id: 'core.status.response' }
);

export const redactedStatusResponse = schema.object(
  {
    status: schema.object({
      overall: schema.object({
        level: serviceStatusLevelId,
      }),
    }),
  },
  { id: 'core.status.redactedResponse' }
);

export type RedactedStatusHttpBody = TypeOf<typeof redactedStatusResponse>;
