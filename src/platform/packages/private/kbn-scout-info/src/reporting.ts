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

// Playwright attachment name used to pass browser console errors from the scout page
// fixture (@kbn/scout) to Scout reporters (@kbn/scout-reporting).
export const BROWSER_CONSOLE_ERRORS_ATTACHMENT = 'browser-console-errors';

export enum ScoutTestRunConfigCategory {
  UI_TEST = 'ui-test',
  API_TEST = 'api-test',
  UNIT_TEST = 'unit-test',
  UNIT_INTEGRATION_TEST = 'unit-integration-test',
  UNKNOWN = 'unknown',
}

/**
 * Why the current process's test run was started, as declared via SCOUT_TEST_RUN_SCOPE
 * (e.g. `pull-request`, `batch-daily-ipv6`); `unknown` when undeclared.
 *
 * Reporting metadata only: it must never influence which tests run or how.
 */
export const SCOUT_TEST_RUN_SCOPE = process.env.SCOUT_TEST_RUN_SCOPE?.trim() || 'unknown';

/** The Elastic Cloud serverless project or hosted deployment a test run targets. */
export interface ScoutElasticCloudTarget {
  readonly project?: { readonly id: string };
  readonly deployment?: { readonly id: string };
  readonly region?: string;
  /** The Elastic Cloud environment, e.g. `qa`: a region name alone exists in several. */
  readonly environment?: string;
}

/**
 * The Elastic Cloud project or deployment declared via SCOUT_TARGET_ELASTIC_CLOUD_PROJECT_ID,
 * SCOUT_TARGET_ELASTIC_CLOUD_DEPLOYMENT_ID, SCOUT_TARGET_ELASTIC_CLOUD_REGION and
 * SCOUT_TARGET_ELASTIC_CLOUD_ENVIRONMENT by the pipeline that created it; undefined when neither
 * ID is set. Read per call, like the target attributes.
 */
export const elasticCloudTargetFromEnv = (): ScoutElasticCloudTarget | undefined => {
  const projectId = process.env.SCOUT_TARGET_ELASTIC_CLOUD_PROJECT_ID?.trim();
  const deploymentId = process.env.SCOUT_TARGET_ELASTIC_CLOUD_DEPLOYMENT_ID?.trim();
  const region = process.env.SCOUT_TARGET_ELASTIC_CLOUD_REGION?.trim();
  const environment = process.env.SCOUT_TARGET_ELASTIC_CLOUD_ENVIRONMENT?.trim();
  if (!projectId && !deploymentId) {
    return undefined;
  }
  return {
    ...(projectId ? { project: { id: projectId } } : {}),
    ...(deploymentId ? { deployment: { id: deploymentId } } : {}),
    ...(region ? { region } : {}),
    ...(environment ? { environment } : {}),
  };
};
