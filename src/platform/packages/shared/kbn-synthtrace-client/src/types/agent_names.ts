/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type ElasticAgentName =
  | 'go'
  | 'java'
  | 'js-base'
  | 'iOS/swift'
  | 'rum-js'
  | 'nodejs'
  | 'python'
  | 'dotnet'
  | 'ruby'
  | 'php'
  | 'android/java';

const OPEN_TELEMETRY_BASE_AGENT_NAMES = ['otlp', 'opentelemetry'] as const;
export const EDOT_AGENT_NAMES = [
  'opentelemetry/java/elastic',
  'opentelemetry/dotnet/elastic',
  'opentelemetry/nodejs/elastic',
  'opentelemetry/php/elastic',
  'opentelemetry/python/elastic',
] as const;

const OPEN_TELEMETRY_AGENT_NAMES = [
  ...EDOT_AGENT_NAMES,
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
] as const;

export type OpenTelemetryAgentName = (typeof OPEN_TELEMETRY_AGENT_NAMES)[number];

// Unable to reference AgentName from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent' due to circular reference
export type AgentName = ElasticAgentName | OpenTelemetryAgentName;
