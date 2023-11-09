/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export const ELASTIC_AGENT_NAMES = [
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
] as const;

export const OPEN_TELEMETRY_AGENT_NAMES = [
  'otlp',
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
  'opentelemetry/webjs',
] as const;

export const JAVA_AGENT_NAMES = ['java', 'opentelemetry/java'] as const;

export const RUM_AGENT_NAMES = ['js-base', 'rum-js', 'opentelemetry/webjs'] as const;

export const SERVERLESS_TYPE = ['aws.lambda', 'azure.functions'] as const;

export type ElasticAgentName = typeof ELASTIC_AGENT_NAMES[number];
export type OpenTelemetryAgentName = typeof OPEN_TELEMETRY_AGENT_NAMES[number];
export type JavaAgentName = typeof JAVA_AGENT_NAMES[number];
export type RumAgentName = typeof RUM_AGENT_NAMES[number];
export type ServerlessType = typeof SERVERLESS_TYPE[number];

export type AgentName = ElasticAgentName | OpenTelemetryAgentName | JavaAgentName | RumAgentName;

export const AGENT_NAMES: AgentName[] = [
  ...ELASTIC_AGENT_NAMES,
  ...OPEN_TELEMETRY_AGENT_NAMES,
  ...JAVA_AGENT_NAMES,
  ...RUM_AGENT_NAMES,
];
