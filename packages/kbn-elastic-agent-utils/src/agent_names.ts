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
  | 'otlp'
  | 'opentelemetry'
  | 'opentelemetry/cpp'
  | 'opentelemetry/dotnet'
  | 'opentelemetry/erlang'
  | 'opentelemetry/go'
  | 'opentelemetry/java'
  | 'opentelemetry/nodejs'
  | 'opentelemetry/php'
  | 'opentelemetry/python'
  | 'opentelemetry/ruby'
  | 'opentelemetry/rust'
  | 'opentelemetry/swift'
  | 'opentelemetry/android'
  | 'opentelemetry/webjs';
export const OPEN_TELEMETRY_AGENT_NAMES: OpenTelemetryAgentName[] = [
  'otlp',
  'opentelemetry',
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
];

export type JavaAgentName = 'java' | 'opentelemetry/java';
export const JAVA_AGENT_NAMES: JavaAgentName[] = ['java', 'opentelemetry/java'];

export type RumAgentName = 'js-base' | 'rum-js' | 'opentelemetry/webjs';
export const RUM_AGENT_NAMES: RumAgentName[] = ['js-base', 'rum-js', 'opentelemetry/webjs'];

export type ServerlessType = 'aws.lambda' | 'azure.functions';
export const SERVERLESS_TYPE: ServerlessType[] = ['aws.lambda', 'azure.functions'];

export type AgentName = ElasticAgentName | OpenTelemetryAgentName | JavaAgentName | RumAgentName;
export const AGENT_NAMES: AgentName[] = [
  ...ELASTIC_AGENT_NAMES,
  ...OPEN_TELEMETRY_AGENT_NAMES,
  ...JAVA_AGENT_NAMES,
  ...RUM_AGENT_NAMES,
];
