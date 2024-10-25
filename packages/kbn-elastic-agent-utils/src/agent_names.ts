/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * We cannot mark these arrays as const and derive their type
 * because we need to be able to assign them as mutable entities for ES queries.
 */
export type ElasticAgentName =
  | 'dotnet'
  | 'go'
  | 'iOS/swift'
  | 'java'
  | 'js-base'
  | 'nodejs'
  | 'php'
  | 'python'
  | 'ruby'
  | 'rum-js'
  | 'android/java';
export const ELASTIC_AGENT_NAMES: ElasticAgentName[] = [
  'dotnet',
  'go',
  'iOS/swift',
  'java',
  'js-base',
  'nodejs',
  'php',
  'python',
  'ruby',
  'rum-js',
  'android/java',
];

export type OpenTelemetryAgentName =
  | 'opentelemetry'
  | 'otlp'
  | `opentelemetry/${string}`
  | `otlp/${string}`;
export const OPEN_TELEMETRY_BASE_AGENT_NAMES: OpenTelemetryAgentName[] = ['otlp', 'opentelemetry'];
export const OPEN_TELEMETRY_AGENT_NAMES: OpenTelemetryAgentName[] = [
  ...OPEN_TELEMETRY_BASE_AGENT_NAMES,
  'opentelemetry/cpp',
  'opentelemetry/dotnet',
  'opentelemetry/erlang',
  'opentelemetry/go',
  'opentelemetry/java',
  'opentelemetry/nodejs',
  'opentelemetry/php',
  'opentelemetry/python',
  'opentelemetry/ruby',
  'opentelemetry/rust',
  'opentelemetry/swift',
  'opentelemetry/android',
  'opentelemetry/webjs',
  'otlp/cpp',
  'otlp/dotnet',
  'otlp/erlang',
  'otlp/go',
  'otlp/java',
  'otlp/nodejs',
  'otlp/php',
  'otlp/python',
  'otlp/ruby',
  'otlp/rust',
  'otlp/swift',
  'otlp/android',
  'otlp/webjs',
];

export type JavaAgentName = 'java' | 'opentelemetry/java' | 'otlp/java';
export const JAVA_AGENT_NAMES: JavaAgentName[] = ['java', 'opentelemetry/java', 'otlp/java'];

export type RumAgentName = 'js-base' | 'rum-js' | 'opentelemetry/webjs' | 'otlp/webjs';
export const RUM_AGENT_NAMES: RumAgentName[] = [
  'js-base',
  'rum-js',
  'opentelemetry/webjs',
  'otlp/webjs',
];

export type AndroidAgentName = 'android/java' | 'opentelemetry/android' | 'otlp/android';
export const ANDROID_AGENT_NAMES: AndroidAgentName[] = [
  'android/java',
  'opentelemetry/android',
  'otlp/android',
];

export type IOSAgentName = 'ios/swift' | 'opentelemetry/swift' | 'otlp/swift';
export const IOS_AGENT_NAMES: IOSAgentName[] = ['ios/swift', 'opentelemetry/swift', 'otlp/swift'];

export type ServerlessType = 'aws.lambda' | 'azure.functions';
export const SERVERLESS_TYPE: ServerlessType[] = ['aws.lambda', 'azure.functions'];

export type AgentName =
  | ElasticAgentName
  | OpenTelemetryAgentName
  | JavaAgentName
  | RumAgentName
  | AndroidAgentName
  | IOSAgentName;
export const AGENT_NAMES: AgentName[] = [
  ...ELASTIC_AGENT_NAMES,
  ...OPEN_TELEMETRY_AGENT_NAMES,
  ...JAVA_AGENT_NAMES,
  ...RUM_AGENT_NAMES,
  ...ANDROID_AGENT_NAMES,
  ...IOS_AGENT_NAMES,
];
