/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Latest exports
export {
  datadogAlertEventSchema,
  datadogMonitorSchema,
  datadogAlertEventsRequestSchema,
  datadogAlertEventsResponseSchema,
  datadogMonitorsRequestSchema,
  datadogMonitorsResponseSchema,
} from './schemas/latest';

export type {
  DatadogAlertEvent,
  DatadogMonitor,
  DatadogExternalAlertConfig,
  DatadogAlertEventsResponse,
  DatadogMonitorsRequest,
  DatadogMonitorsResponse,
} from './types/latest';

// Versioned exports
export {
  datadogAlertEventSchema as datadogAlertEventSchemaV1,
  datadogMonitorSchema as datadogMonitorSchemaV1,
  datadogAlertEventsRequestSchema as datadogAlertEventsRequestSchemaV1,
  datadogAlertEventsResponseSchema as datadogAlertEventsResponseSchemaV1,
  datadogMonitorsRequestSchema as datadogMonitorsRequestSchemaV1,
  datadogMonitorsResponseSchema as datadogMonitorsResponseSchemaV1,
} from './schemas/v1';

export type {
  DatadogAlertEvent as DatadogAlertEventV1,
  DatadogMonitor as DatadogMonitorV1,
  DatadogExternalAlertConfig as DatadogExternalAlertConfigV1,
  DatadogAlertEventsResponse as DatadogAlertEventsResponseV1,
  DatadogMonitorsRequest as DatadogMonitorsRequestV1,
  DatadogMonitorsResponse as DatadogMonitorsResponseV1,
} from './types/v1';
