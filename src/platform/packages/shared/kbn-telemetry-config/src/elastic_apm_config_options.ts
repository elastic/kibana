/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface Labels {
  [key: string]: LabelValue;
}

type LabelValue = string | number | boolean | null | undefined;
type KeyValueConfig = string | Labels | LabelValue[][];
type CaptureBody = 'off' | 'errors' | 'transactions' | 'all';
type CaptureErrorLogStackTraces = 'never' | 'messages' | 'always';
type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'warning'
  | 'error'
  | 'fatal'
  | 'critical'
  | 'off';

type TraceContinuationStrategy = 'continue' | 'restart' | 'restart_external';

interface Logger {
  // Defining overloaded methods rather than a separate `interface LogFn`
  // as @types/pino does, because the IDE completion shows these as *methods*
  // rather than as properties, which is slightly nicer.
  fatal(msg: string, ...args: any[]): void;
  fatal(obj: {}, msg?: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  error(obj: {}, msg?: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  warn(obj: {}, msg?: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  info(obj: {}, msg?: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  debug(obj: {}, msg?: string, ...args: any[]): void;
  trace(msg: string, ...args: any[]): void;
  trace(obj: {}, msg?: string, ...args: any[]): void;
  // Allow a passed in Logger that has other properties, as a Pino logger
  // does. Discussion:
  // https://github.com/elastic/apm-agent-nodejs/pull/926/files#r266239656
  [propName: string]: any;
}

/**
 * AgentConfigOptions as exposed by the Elastic APM agent. Here so we can remove elastic-apm-node
 * from the repo but still support the config options
 */
export interface AgentConfigOptions {
  abortedErrorThreshold?: string; // Also support `number`, but as we're removing this functionality soon, there's no need to advertise it
  active?: boolean;
  addPatch?: KeyValueConfig;
  apiKey?: string;
  apiRequestSize?: string; // Also support `number`, but as we're removing this functionality soon, there's no need to advertise it
  apiRequestTime?: string; // Also support `number`, but as we're removing this functionality soon, there's no need to advertise it
  breakdownMetrics?: boolean;
  captureBody?: CaptureBody;
  captureErrorLogStackTraces?: CaptureErrorLogStackTraces;
  captureExceptions?: boolean;
  captureHeaders?: boolean;
  /**
   * @deprecated Use `spanStackTraceMinDuration`.
   */
  captureSpanStackTraces?: boolean;
  centralConfig?: boolean;
  cloudProvider?: string;
  configFile?: string;
  containerId?: string;
  contextManager?: string;
  contextPropagationOnly?: boolean;
  disableInstrumentations?: string | string[];
  disableSend?: boolean;
  elasticsearchCaptureBodyUrls?: string[];
  environment?: string;
  /**
   * @deprecated Use `longFieldMaxLength`
   */
  errorMessageMaxLength?: string;
  errorOnAbortedRequests?: boolean;
  exitSpanMinDuration?: string;
  frameworkName?: string;
  frameworkVersion?: string;
  globalLabels?: KeyValueConfig;
  hostname?: string;
  ignoreMessageQueues?: string[];
  ignoreUrls?: Array<string | RegExp>;
  ignoreUserAgents?: Array<string | RegExp>;
  instrument?: boolean;
  instrumentIncomingHTTPRequests?: boolean;
  kubernetesNamespace?: string;
  kubernetesNodeName?: string;
  kubernetesPodName?: string;
  kubernetesPodUID?: string;
  logLevel?: LogLevel;
  logger?: Logger; // Notably this Logger interface matches the Pino Logger.
  longFieldMaxLength?: number;
  maxQueueSize?: number;
  metricsInterval?: string; // Also support `number`, but as we're removing this functionality soon, there's no need to advertise it
  metricsLimit?: number;
  opentelemetryBridgeEnabled?: boolean;
  payloadLogFile?: string;
  sanitizeFieldNames?: string[];
  secretToken?: string;
  serverCaCertFile?: string;
  serverTimeout?: string; // Also support `number`, but as we're removing this functionality soon, there's no need to advertise it
  serverUrl?: string;
  serviceName?: string;
  serviceNodeName?: string;
  serviceVersion?: string;
  sourceLinesErrorAppFrames?: number;
  sourceLinesErrorLibraryFrames?: number;
  sourceLinesSpanAppFrames?: number;
  sourceLinesSpanLibraryFrames?: number;
  spanCompressionEnabled?: boolean;
  spanCompressionExactMatchMaxDuration?: string;
  spanCompressionSameKindMaxDuration?: string;
  /**
   * @deprecated Use `spanStackTraceMinDuration`.
   */
  spanFramesMinDuration?: string;
  spanStackTraceMinDuration?: string;
  stackTraceLimit?: number;
  traceContinuationStrategy?: TraceContinuationStrategy;
  transactionIgnoreUrls?: string[];
  transactionMaxSpans?: number;
  transactionSampleRate?: number;
  useElasticTraceparentHeader?: boolean;
  usePathAsTransactionName?: boolean;
  verifyServerCert?: boolean;
}
