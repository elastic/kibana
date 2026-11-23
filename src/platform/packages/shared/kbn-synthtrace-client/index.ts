/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { observer } from './src/lib/agent_config';
export type { AgentConfigFields } from './src/lib/agent_config/agent_config_fields';
export { apm, apmOtel } from './src/lib/apm';
export type { ApmFields, APMStacktrace } from './src/lib/apm/apm_fields';
export type {
  ApmOtelFields,
  ApmOtelAttributes,
  SpanKind,
} from './src/lib/apm/otel/apm_otel_fields';
export type { Instance } from './src/lib/apm/instance';
export type { OtelInstance } from './src/lib/apm/otel/otel_instance';
export { MobileDevice } from './src/lib/apm/mobile_device';
export type {
  DeviceInfo,
  GeoInfo,
  NetworkConnectionInfo,
  OSInfo,
} from './src/lib/apm/mobile_device';
export { httpExitSpan } from './src/lib/apm/span';
export { DistributedTrace } from './src/lib/dsl/distributed_trace_client';
export { serviceMap } from './src/lib/dsl/service_map';
export type { Fields } from './src/lib/entity';
export { Entity } from './src/lib/entity';
export { infra, type InfraDocument } from './src/lib/infra';
export { parseInterval } from './src/lib/interval';
export { monitoring, type MonitoringDocument } from './src/lib/monitoring';
export { Serializable } from './src/lib/serializable';
export { timerange } from './src/lib/timerange';
export type { Timerange } from './src/lib/timerange';
export { dedot } from './src/lib/utils/dedot';
export {
  generateLongId,
  generateShortId,
  setIdGeneratorStrategy,
} from './src/lib/utils/generate_id';
export { appendHash, hashKeysOf } from './src/lib/utils/hash';
export { createSeededRandom } from './src/lib/utils/seeded_random';
export {
  type ESDocumentWithOperation,
  type SynthtraceESAction,
  type SynthtraceGenerator,
  type SynthtraceDynamicTemplate,
  type ApmSynthtracePipelines,
  ApmSynthtracePipelineSchema,
} from './src/types';
export { log, type LogDocument, LONG_FIELD_NAME } from './src/lib/logs';
export { otelLog, type OtelLogDocument } from './src/lib/otel_logs';
export {
  edotBrowser,
  type BrowserProfileId,
  type EdotBrowserClickTarget,
  type EdotBrowserClientOptions,
  type EdotBrowserUser,
  type EdotBrowserDocument,
  type EdotBrowserEvent,
  type EdotBrowserExceptionTemplate,
  type EdotBrowserOutage,
  type EdotBrowserPage,
  type EdotBrowserRatedException,
  type EdotBrowserRequest,
  type EdotBrowserReplayOptions,
  type EdotBrowserReplayVisit,
  type EdotBrowserResource,
  type EdotBrowserSessionDocument,
  type EdotBrowserSite,
  type EdotBrowserStackFrame,
  type EdotBrowserSpanDocument,
  type HealthProfileName,
  type ReplaySize,
} from './src/lib/edot_browser';
export {
  edotReactNative,
  MOBILE_SPAN_KIND,
  MOBILE_PLATFORM,
  MOBILE_PLATFORMS,
  type DeviceProfile,
  type DeviceProfileId,
  type EdotAndroidClient,
  type EdotIosClient,
  type EdotReactNativeAppModel,
  type EdotReactNativeClient,
  type EdotReactNativeClientOptions,
  type EdotReactNativeDocument,
  type EdotReactNativeEvent,
  type EdotReactNativeRequest,
  type EdotReactNativeScreen,
  type EdotReactNativeSessionOptions,
  type EdotReactNativeSpanDocument,
  type EdotReactNativeWidget,
  type IosAppState,
  type ManualSpanOptions,
  type MobileHealthProfile,
  type MobilePlatform,
  type NetworkConnection,
  type NetworkConnectionType,
} from './src/lib/edot_react_native';
export {
  EVENT_APP_CRASH,
  EVENT_EXCEPTION,
  EVENT_WIDGET_CLICK,
} from './src/lib/edot_shared/constants';
export {
  ATTR_APP_START_DURATION,
  ATTR_ERROR_KIND,
  ATTR_SCREEN_NAME,
  ATTR_SESSION_PREVIOUS_ID,
  ATTR_START_TYPE,
  ERROR_KIND_ANR,
  ERROR_KIND_HANG,
  EVENT_APP_START,
  EVENT_SCREEN_CLICK,
  EVENT_SESSION_END,
  EVENT_SESSION_START,
  SPAN_SCREEN_LOAD,
  START_TYPE_COLD,
  START_TYPE_WARM,
} from './src/lib/edot_shared/proposed_signals';
export {
  syntheticsMonitor,
  type BrowserJourneyStep,
  type SyntheticsMonitorDocument,
} from './src/lib/synthetics';
