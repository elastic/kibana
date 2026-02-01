/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type {
  datadogAlertEventSchema,
  datadogMonitorSchema,
  datadogAlertEventsRequestSchema,
  datadogAlertEventsResponseSchema,
  datadogMonitorsRequestSchema,
  datadogMonitorsResponseSchema,
} from '../schemas/v1';

/**
 * Datadog alert event type
 */
export type DatadogAlertEvent = z.infer<typeof datadogAlertEventSchema>;

/**
 * Datadog monitor type
 */
export type DatadogMonitor = z.infer<typeof datadogMonitorSchema>;

/**
 * Datadog external alert configuration type
 */
export type DatadogExternalAlertConfig = z.infer<typeof datadogAlertEventsRequestSchema>;

/**
 * Datadog alert events response type
 * This matches the return type of the getAlertEvents action
 */
export type DatadogAlertEventsResponse = z.infer<typeof datadogAlertEventsResponseSchema>;

/**
 * Datadog monitors request type
 * This matches the input type of the listMonitors action
 */
export type DatadogMonitorsRequest = z.infer<typeof datadogMonitorsRequestSchema>;

/**
 * Datadog monitors response type
 * This matches the return type of the listMonitors action
 */
export type DatadogMonitorsResponse = z.infer<typeof datadogMonitorsResponseSchema>;
