/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getTelemetryOptIn } from './get_telemetry_opt_in';
export { getTelemetrySendUsageFrom } from './get_telemetry_send_usage_from';
export { getTelemetryAllowChangingOptInStatus } from './get_telemetry_allow_changing_opt_in_status';
export { getTelemetryFailureDetails } from './get_telemetry_failure_details';
export type { TelemetryFailureDetails } from './get_telemetry_failure_details';
export { getTelemetryChannelEndpoint } from './get_telemetry_channel_endpoint';
export type {
  GetTelemetryChannelEndpointConfig,
  ChannelName,
  TelemetryEnv,
} from './get_telemetry_channel_endpoint';
