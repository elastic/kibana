/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  getAgentName,
  isOpenTelemetryAgentName,
  hasOpenTelemetryPrefix,
  isJavaAgentName,
  isRumAgentName,
  isMobileAgentName,
  isRumOrMobileAgentName,
  isIosAgentName,
  isAndroidAgentName,
  isJRubyAgentName,
  isServerlessAgentName,
  isAWSLambdaAgentName,
  isAzureFunctionsAgentName,
} from './src/agent_guards';

export {
  ELASTIC_AGENT_NAMES,
  OPEN_TELEMETRY_AGENT_NAMES,
  JAVA_AGENT_NAMES,
  RUM_AGENT_NAMES,
  SERVERLESS_TYPE,
  AGENT_NAMES,
} from './src/agent_names';

export type {
  ElasticAgentName,
  OpenTelemetryAgentName,
  JavaAgentName,
  RumAgentName,
  ServerlessType,
  AgentName,
} from './src/agent_names';
