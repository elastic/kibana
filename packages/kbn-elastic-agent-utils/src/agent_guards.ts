/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JAVA_AGENT_NAMES, OPEN_TELEMETRY_AGENT_NAMES, RUM_AGENT_NAMES } from './agent_names';

import type {
  JavaAgentName,
  OpenTelemetryAgentName,
  RumAgentName,
  ServerlessType,
} from './agent_names';

export function isOpenTelemetryAgentName(agentName: string): agentName is OpenTelemetryAgentName {
  return agentName?.startsWith("opentelemetry/") || OPEN_TELEMETRY_AGENT_NAMES.includes(agentName as OpenTelemetryAgentName);
}

export function isJavaAgentName(agentName?: string): agentName is JavaAgentName {
  return agentName?.startsWith("opentelemetry/java") || JAVA_AGENT_NAMES.includes(agentName! as JavaAgentName);
}

export function isRumAgentName(agentName?: string): agentName is RumAgentName {
  return RUM_AGENT_NAMES.includes(agentName! as RumAgentName);
}

export function isMobileAgentName(agentName?: string) {
  return isIosAgentName(agentName) || isAndroidAgentName(agentName);
}

export function isRumOrMobileAgentName(agentName?: string) {
  return isRumAgentName(agentName) || isMobileAgentName(agentName);
}

export function isIosAgentName(agentName?: string) {
  return agentName?.toLowerCase() === 'ios/swift';
}

export function isAndroidAgentName(agentName?: string) {
  const lowercased = agentName && agentName.toLowerCase();
  return lowercased === 'android/java';
}

export function isJRubyAgentName(agentName?: string, runtimeName?: string) {
  return agentName === 'ruby' && runtimeName?.toLowerCase() === 'jruby';
}

export function isServerlessAgentName(serverlessType?: string): serverlessType is ServerlessType {
  return isAWSLambdaAgentName(serverlessType) || isAzureFunctionsAgentName(serverlessType);
}

export function isAWSLambdaAgentName(serverlessType?: string): serverlessType is ServerlessType {
  return serverlessType === 'aws.lambda';
}

export function isAzureFunctionsAgentName(
  serverlessType?: string
): serverlessType is ServerlessType {
  return serverlessType === 'azure.functions';
}
