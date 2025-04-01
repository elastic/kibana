/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function booleanFromEnv(varName: string, defaultValue: boolean = false): boolean {
  const envValue = process.env[varName];
  if (envValue === undefined || envValue.trim().length === 0) return defaultValue;
  return ['1', 'yes', 'true'].includes(envValue.trim().toLowerCase());
}

export const SCOUT_REPORTER_ENABLED = booleanFromEnv('SCOUT_REPORTER_ENABLED');
export const SCOUT_REPORTER_ES_URL = process.env.SCOUT_REPORTER_ES_URL;
export const SCOUT_REPORTER_ES_API_KEY = process.env.SCOUT_REPORTER_ES_API_KEY;
export const SCOUT_REPORTER_ES_VERIFY_CERTS = booleanFromEnv(
  'SCOUT_REPORTER_ES_VERIFY_CERTS',
  true
);
export const SCOUT_TEST_EVENTS_TEMPLATE_NAME =
  process.env.SCOUT_TEST_EVENTS_TEMPLATE_NAME || 'scout-test-events';
export const SCOUT_TEST_EVENTS_INDEX_PATTERN =
  process.env.SCOUT_TEST_EVENTS_INDEX_PATTERN || `${SCOUT_TEST_EVENTS_TEMPLATE_NAME}-*`;
export const SCOUT_TEST_EVENTS_DATA_STREAM_NAME =
  process.env.SCOUT_TEST_EVENTS_DATA_STREAM_NAME || `${SCOUT_TEST_EVENTS_TEMPLATE_NAME}-kibana`;

export enum ScoutTestRunConfigCategory {
  UI_TEST = 'ui-test',
  API_TEST = 'api-test',
  UNIT_TEST = 'unit-test',
  UNIT_INTEGRATION_TEST = 'unit-integration-test',
  UNKNOWN = 'unknown',
}
