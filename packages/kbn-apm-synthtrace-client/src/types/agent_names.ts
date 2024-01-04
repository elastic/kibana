/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

type OpenTelemetryAgentName =
  | 'otlp'
  | 'opentelemetry/cpp'
  | 'opentelemetry/dotnet'
  | 'opentelemetry/erlang'
  | 'opentelemetry/go'
  | 'opentelemetry/java'
  | 'opentelemetry/nodejs'
  | 'opentelemetry/php'
  | 'opentelemetry/python'
  | 'opentelemetry/ruby'
  | 'opentelemetry/swift'
  | 'opentelemetry/android'
  | 'opentelemetry/webjs';

// Unable to reference AgentName from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent' due to circular reference
export type AgentName = ElasticAgentName | OpenTelemetryAgentName;
