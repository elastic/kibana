/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { createEscapeValue } from '@kbn/data-plugin/common';

const { PDF_JOB_TYPE, PDF_JOB_TYPE_V2, PNG_JOB_TYPE, PNG_JOB_TYPE_V2 } = jobTypes;

export const PLUGIN_ID = 'reporting';

export const REPORTING_TRANSACTION_TYPE = PLUGIN_ID;

export const REPORTING_SYSTEM_INDEX = '.reporting';

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

export const CONTENT_TYPE_CSV = 'text/csv';
export const CSV_REPORTING_ACTION = 'downloadCsvReport';
export const CSV_BOM_CHARS = '\ufeff';
export const CSV_FORMULA_CHARS = ['=', '+', '-', '@'];

export const ALLOWED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  CONTENT_TYPE_CSV,
  'image/png',
  'text/plain',
];

export const UI_SETTINGS_CSV_SEPARATOR = 'csv:separator';
export const UI_SETTINGS_CSV_QUOTE_VALUES = 'csv:quoteValues';
export const UI_SETTINGS_DATEFORMAT_TZ = 'dateFormat:tz';

type ReportTypeDeclaration = typeof reportTypes;
export type ReportTypes = ReportTypeDeclaration[keyof ReportTypeDeclaration];

type JobTypeDeclaration = typeof jobTypes;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];

export const CSV_SEARCHSOURCE_IMMEDIATE_TYPE = 'csv_searchsource_immediate';

// This is deprecated because it lacks support for runtime fields
// but the extension points are still needed for pre-existing scripted automation, until 8.0
export const CSV_REPORT_TYPE_DEPRECATED = 'CSV';
export const CSV_JOB_TYPE_DEPRECATED = 'csv';

export const USES_HEADLESS_JOB_TYPES = [
  PDF_JOB_TYPE,
  PNG_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PNG_JOB_TYPE_V2,
];

export const DEPRECATED_JOB_TYPES = [CSV_JOB_TYPE_DEPRECATED];

// Licenses
export const LICENSE_TYPE_TRIAL = 'trial';
export const LICENSE_TYPE_BASIC = 'basic';
export const LICENSE_TYPE_CLOUD_STANDARD = 'standard';
export const LICENSE_TYPE_GOLD = 'gold';
export const LICENSE_TYPE_PLATINUM = 'platinum';
export const LICENSE_TYPE_ENTERPRISE = 'enterprise';

// Routes
export const API_BASE_URL = '/api/reporting'; // "Generation URL" from share menu
export const API_BASE_GENERATE = `${API_BASE_URL}/generate`;
export const API_LIST_URL = `${API_BASE_URL}/jobs`;
export const API_DIAGNOSE_URL = `${API_BASE_URL}/diagnose`;

export const API_GET_ILM_POLICY_STATUS = `${API_BASE_URL}/ilm_policy_status`;
export const API_MIGRATE_ILM_POLICY_URL = `${API_BASE_URL}/deprecations/migrate_ilm_policy`;
export const API_BASE_URL_V1 = '/api/reporting/v1'; //

export const ILM_POLICY_NAME = 'kibana-reporting';

// Usage counter types
export const API_USAGE_COUNTER_TYPE = 'reportingApi';
export const API_USAGE_ERROR_TYPE = 'reportingApiError';

// Management UI route
export const REPORTING_MANAGEMENT_HOME = '/app/management/insightsAndAlerting/reporting';

export const REPORTING_REDIRECT_LOCATOR_STORE_KEY = '__REPORTING_REDIRECT_LOCATOR_STORE_KEY__';

// Export Reporting Type Definitions
export const CSV_REPORT_TYPE = 'CSV';
export const CSV_REPORT_TYPE_V2 = 'csv_v2';

export const PDF_REPORT_TYPE = 'printablePdf';
export const PDF_REPORT_TYPE_V2 = 'printablePdfV2';

export const PNG_REPORT_TYPE = 'PNG';
export const PNG_REPORT_TYPE_V2 = 'pngV2';

// Export Job Type Definitions
export const CSV_JOB_TYPE = 'csv_searchsource';

export const PDF_JOB_TYPE = 'printable_pdf';
export const PDF_JOB_TYPE_V2 = 'printable_pdf_v2';

export const PNG_JOB_TYPE = 'PNG';
export const PNG_JOB_TYPE_V2 = 'PNGV2';

/**
 * A way to get the client side route for the reporting redirect app.
 *
 * TODO: Add a job ID and a locator to use so that we can redirect without expecting state to
 * be injected to the page
 */
export const getRedirectAppPath = () => {
  return '/app/reportingRedirect';
};

// Statuses
export enum JOB_STATUSES {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WARNINGS = 'completed_with_warnings',
}

// Test Subjects
export const REPORT_TABLE_ID = 'reportJobListing';
export const REPORT_TABLE_ROW_ID = 'reportJobRow';

// Job params require a `version` field as of 7.15.0. For older jobs set with
// automation that have no version value in the job params, we assume the
// intended version is 7.14.0
export const UNVERSIONED_VERSION = '7.14.0';

// hacky endpoint: download CSV without queueing a report
// FIXME: find a way to make these endpoints "generic" instead of hardcoded, as are the queued report export types
export const API_GENERATE_IMMEDIATE = `${API_BASE_URL_V1}/generate/immediate/csv_searchsource`;

export const CsvConfig = schema.object({
  checkForFormulas: schema.boolean({ defaultValue: true }),
  escapeFormulaValues: schema.boolean({ defaultValue: false }),
  enablePanelActionDownload: schema.boolean({ defaultValue: true }),
  maxSizeBytes: schema.oneOf([schema.number(), schema.byteSize()], {
    defaultValue: ByteSizeValue.parse('10mb'),
  }),
  useByteOrderMarkEncoding: schema.boolean({ defaultValue: false }),
  scroll: schema.object({
    duration: schema.string({
      defaultValue: '30s', // this value is passed directly to ES, so string only format is preferred
      validate(value) {
        if (!/^[0-9]+(d|h|m|s|ms|micros|nanos)$/.test(value)) {
          return 'must be a duration string';
        }
      },
    }),
    size: schema.number({ defaultValue: 500 }),
  }),
});

export type CsvConfigType = typeof CsvConfigType;

export interface CsvExportSettings {
  timezone: string;
  scroll: {
    size: number;
    duration: string;
  };
  bom: string;
  separator: string;
  maxSizeBytes: number | ByteSizeValue;
  checkForFormulas: boolean;
  escapeFormulaValues: boolean;
  escapeValue: (value: string) => string;
  includeFrozen: boolean;
}

export const getExportSettings = async (
  client: IUiSettingsClient,
  config: CsvConfigType,
  timezone: string | undefined,
  logger: Logger
): Promise<CsvExportSettings> => {
  let setTimezone: string;
  if (timezone) {
    setTimezone = timezone;
  } else {
    // timezone in settings?
    setTimezone = await client.get(UI_SETTINGS_DATEFORMAT_TZ);
    if (setTimezone === 'Browser') {
      // if `Browser`, hardcode it to 'UTC' so the export has data that makes sense
      logger.warn(
        `Kibana Advanced Setting "dateFormat:tz" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.`
      );
      setTimezone = 'UTC';
    }
  }

  // Advanced Settings that affect search export + CSV
  const [includeFrozen, separator, quoteValues] = await Promise.all([
    client.get(UI_SETTINGS_SEARCH_INCLUDE_FROZEN),
    client.get(UI_SETTINGS_CSV_SEPARATOR),
    client.get(UI_SETTINGS_CSV_QUOTE_VALUES),
  ]);

  const escapeFormulaValues = config.escapeFormulaValues;
  const escapeValue = createEscapeValue(quoteValues, escapeFormulaValues);
  const bom = config.useByteOrderMarkEncoding ? CSV_BOM_CHARS : '';

  return {
    timezone: setTimezone,
    scroll: {
      size: config.scroll.size,
      duration: config.scroll.duration,
    },
    bom,
    includeFrozen,
    separator,
    maxSizeBytes: config.maxSizeBytes,
    checkForFormulas: config.checkForFormulas,
    escapeFormulaValues,
    escapeValue,
  };
};

interface TaskRunResult {
  content_type: string | null;
  csv_contains_formulas?: boolean;
  max_size_reached?: boolean;
  warnings?: string[];
  metrics?: CsvMetrics;

  /**
   * When running a report task we may finish with warnings that were triggered
   * by an error. We can pass the error code via the task run result to the
   * task runner so that it can be recorded for telemetry.
   *
   * Alternatively, this field can be populated in the event that the task does
   * not complete in the task runner's error handler.
   */
  error_code?: string;
}

export interface JobParams {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
  browserTimezone?: string;
}

export interface TaskPayloadCSV {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
  browserTimezone?: string;
  headers: string;
  spaceId?: string;
  isDeprecated?: boolean;
}

export interface CsvConfig {
  checkForFormulas: boolean;
  escapeFormulaValues: boolean;
  maxSizeBytes: number | ByteSizeValue;
  useByteOrderMarkEncoding: boolean;
  scroll: {
    duration: string;
    size: number;
  };
}

export interface CsvMetrics {
  rows: number;
}

export interface TaskRunResult {
  content_type: string | null;
  csv_contains_formulas?: boolean;
  max_size_reached?: boolean;
  warnings?: string[];
  metrics?: CsvMetrics;

  /**
   * When running a report task we may finish with warnings that were triggered
   * by an error. We can pass the error code via the task run result to the
   * task runner so that it can be recorded for telemetry.
   *
   * Alternatively, this field can be populated in the event that the task does
   * not complete in the task runner's error handler.
   */
  error_code?: string;
}
