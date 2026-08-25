/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isElasticAgentName, isOpenTelemetryAgentName } from './agent_guards';

interface SdkNameAndLanguage {
  sdkName?: 'apm' | 'edot' | 'otel_other';
  language?: string;
}

const LANGUAGE_INDEX = 1;

export const getSdkNameAndLanguage = (agentName: string): SdkNameAndLanguage => {
  if (isElasticAgentName(agentName)) {
    return { sdkName: 'apm', language: agentName };
  }
  const agentNameParts = agentName.split('/');

  if (isOpenTelemetryAgentName(agentName)) {
    if (agentNameParts[agentNameParts.length - 1] === 'elastic') {
      return { sdkName: 'edot', language: agentNameParts[LANGUAGE_INDEX] };
    }
    return {
      sdkName: 'otel_other',
      language: agentNameParts[LANGUAGE_INDEX],
    };
  }

  return { sdkName: undefined, language: undefined };
};
