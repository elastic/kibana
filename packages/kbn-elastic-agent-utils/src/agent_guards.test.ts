/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isAndroidAgentName,
  isAWSLambdaAgentName,
  isAzureFunctionsAgentName,
  isIosAgentName,
  isJavaAgentName,
  isJRubyAgentName,
  isMobileAgentName,
  isOpenTelemetryAgentName,
  isRumAgentName,
  isRumOrMobileAgentName,
  isServerlessAgentName,
} from './agent_guards';

describe('Agents guards', () => {
  it('isOpenTelemetryAgentName should guard if the passed agent is an OpenTelemetry one.', () => {
    expect(isOpenTelemetryAgentName('otlp')).toBe(true);
    expect(isOpenTelemetryAgentName('not-an-agent')).toBe(false);
  });

  it('isJavaAgentName should guard if the passed agent is an Java one.', () => {
    expect(isJavaAgentName('java')).toBe(true);
    expect(isJavaAgentName('not-an-agent')).toBe(false);
  });

  it('isRumAgentName should guard if the passed agent is an Rum one.', () => {
    expect(isRumAgentName('rum-js')).toBe(true);
    expect(isRumAgentName('not-an-agent')).toBe(false);
  });

  it('isMobileAgentName should guard if the passed agent is an Mobile one.', () => {
    expect(isMobileAgentName('ios/swift')).toBe(true);
    expect(isMobileAgentName('android/java')).toBe(true);
    expect(isMobileAgentName('not-an-agent')).toBe(false);
  });

  it('isRumOrMobileAgentName should guard if the passed agent is an RumOrMobile one.', () => {
    expect(isRumOrMobileAgentName('ios/swift')).toBe(true);
    expect(isRumOrMobileAgentName('android/java')).toBe(true);
    expect(isRumOrMobileAgentName('rum-js')).toBe(true);
    expect(isRumOrMobileAgentName('not-an-agent')).toBe(false);
  });

  it('isIosAgentName should guard if the passed agent is an Ios one.', () => {
    expect(isIosAgentName('ios/swift')).toBe(true);
    expect(isIosAgentName('not-an-agent')).toBe(false);
  });

  it('isAndroidAgentName should guard if the passed agent is an Android one.', () => {
    expect(isAndroidAgentName('android/java')).toBe(true);
    expect(isAndroidAgentName('not-an-agent')).toBe(false);
  });

  it('isJRubyAgentName should guard if the passed agent is an JRuby one.', () => {
    expect(isJRubyAgentName('ruby', 'jruby')).toBe(true);
    expect(isJRubyAgentName('ruby')).toBe(false);
    expect(isJRubyAgentName('not-an-agent')).toBe(false);
  });

  it('isServerlessAgentName should guard if the passed agent is an Serverless one.', () => {
    expect(isServerlessAgentName('aws.lambda')).toBe(true);
    expect(isServerlessAgentName('azure.functions')).toBe(true);
    expect(isServerlessAgentName('not-an-agent')).toBe(false);
  });

  it('isAWSLambdaAgentName should guard if the passed agent is an AWSLambda one.', () => {
    expect(isAWSLambdaAgentName('aws.lambda')).toBe(true);
    expect(isAWSLambdaAgentName('not-an-agent')).toBe(false);
  });

  it('isAzureFunctionsAgentName should guard if the passed agent is an AzureFunctions one.', () => {
    expect(isAzureFunctionsAgentName('azure.functions')).toBe(true);
    expect(isAzureFunctionsAgentName('not-an-agent')).toBe(false);
  });
});
