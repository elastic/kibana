/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSdkNameAndLanguage } from './agent_sdk_name_and_language';

describe('getSdkNameAndLanguage', () => {
  it.each([
    {
      agentName: 'java',
      result: { sdkName: 'apm', language: 'java' },
    },
    {
      agentName: 'iOS/swift',
      result: { sdkName: 'apm', language: 'iOS/swift' },
    },
    {
      agentName: 'android/java',
      result: { sdkName: 'apm', language: 'android/java' },
    },
    {
      agentName: 'opentelemetry/java/test/elastic',
      result: { sdkName: 'edot', language: 'java' },
    },
    {
      agentName: 'opentelemetry/java/elastic',
      result: { sdkName: 'edot', language: 'java' },
    },
    {
      agentName: 'otlp/nodejs',
      result: { sdkName: 'otel_other', language: 'nodejs' },
    },
    {
      agentName: 'otlp',
      result: { sdkName: 'otel_other', language: undefined },
    },
    {
      agentName: 'test/test/test/something-else/elastic',
      result: { sdkName: undefined, language: undefined },
    },
    {
      agentName: 'test/java/test/something-else/',
      result: { sdkName: undefined, language: undefined },
    },
    {
      agentName: 'elastic',
      result: { sdkName: undefined, language: undefined },
    },
    {
      agentName: 'my-awesome-agent/otel',
      result: { sdkName: undefined, language: undefined },
    },
  ])('for the agent name $agentName returns $result', ({ agentName, result }) => {
    expect(getSdkNameAndLanguage(agentName)).toStrictEqual(result);
  });
});
