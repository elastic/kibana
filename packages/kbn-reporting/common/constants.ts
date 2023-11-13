/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'reporting';

// Export Type Sets
import {
  CSV_JOB_TYPE,
  CSV_JOB_TYPE_DEPRECATED,
  CSV_JOB_TYPE_V2,
  CSV_REPORT_TYPE,
  CSV_REPORT_TYPE_V2,
} from '@kbn/reporting-export-types-csv-common';
import {
  PDF_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
} from '@kbn/reporting-export-types-pdf-common';
import {
  PNG_JOB_TYPE,
  PNG_JOB_TYPE_V2,
  PNG_REPORT_TYPE,
  PNG_REPORT_TYPE_V2,
} from '@kbn/reporting-export-types-png-common';

export const ALLOWED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  'text/csv',
  'image/png',
  'text/plain',
];

export const reportTypes = [
  CSV_REPORT_TYPE,
  CSV_REPORT_TYPE_V2,
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE,
  PNG_REPORT_TYPE_V2,
];

export const jobTypes = [
  CSV_JOB_TYPE,
  CSV_JOB_TYPE_V2,
  PDF_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PNG_JOB_TYPE,
  PNG_JOB_TYPE_V2,
];

type ReportTypeDeclaration = typeof reportTypes;
export type ReportTypes = ReportTypeDeclaration[keyof ReportTypeDeclaration];

type JobTypeDeclaration = typeof jobTypes;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];

export const USES_HEADLESS_JOB_TYPES = [
  PDF_JOB_TYPE,
  PNG_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PNG_JOB_TYPE_V2,
];

export const DEPRECATED_JOB_TYPES = [CSV_JOB_TYPE_DEPRECATED];

// APM
export const REPORTING_TRANSACTION_TYPE = PLUGIN_ID;

export const REPORTING_REDIRECT_LOCATOR_STORE_KEY = '__REPORTING_REDIRECT_LOCATOR_STORE_KEY__';

export const UI_SETTINGS_SEARCH_INCLUDE_FROZEN = 'search:includeFrozen';
export const UI_SETTINGS_CUSTOM_PDF_LOGO = 'xpackReporting:customPdfLogo';
export const UI_SETTINGS_DATEFORMAT_TZ = 'dateFormat:tz';

// Licenses
export const LICENSE_TYPE_TRIAL = 'trial' as const;
export const LICENSE_TYPE_BASIC = 'basic' as const;
export const LICENSE_TYPE_CLOUD_STANDARD = 'standard' as const;
export const LICENSE_TYPE_GOLD = 'gold' as const;
export const LICENSE_TYPE_PLATINUM = 'platinum' as const;
export const LICENSE_TYPE_ENTERPRISE = 'enterprise' as const;

export const REPORTING_SYSTEM_INDEX = '.reporting';

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

/**
 * A way to get the client side route for the reporting redirect app.
 *
 * TODO: Add a job ID and a locator to use so that we can redirect without expecting state to
 * be injected to the page
 */
export const getRedirectAppPath = () => {
  return '/app/reportingRedirect';
};

export const ILM_POLICY_NAME = 'kibana-reporting';

// Usage counter types
export const API_USAGE_COUNTER_TYPE = 'reportingApi';
export const API_USAGE_ERROR_TYPE = 'reportingApiError';

// Management UI route
export const REPORTING_MANAGEMENT_HOME = '/app/management/insightsAndAlerting/reporting';

/*
 * JobStatus:
 *  - Begins as 'pending'
 *  - Changes to 'processing` when the job is claimed
 *  - Then 'completed' | 'failed' when execution is done
 * If the job needs a retry, it reverts back to 'pending'.
 */
export enum JOB_STATUS {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WARNINGS = 'completed_with_warnings',
}

// Job params require a `version` field as of 7.15.0. For older jobs set with
// automation that have no version value in the job params, we assume the
// intended version is 7.14.0
export const UNVERSIONED_VERSION = '7.14.0';
