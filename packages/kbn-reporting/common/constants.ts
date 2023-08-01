/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as jobTypes from './job_types';

export const PLUGIN_ID = 'reporting';

export const REPORTING_TRANSACTION_TYPE = PLUGIN_ID;
export const REPORTING_REDIRECT_LOCATOR_STORE_KEY = '__REPORTING_REDIRECT_LOCATOR_STORE_KEY__';

export const UI_SETTINGS_SEARCH_INCLUDE_FROZEN = 'search:includeFrozen';
export const UI_SETTINGS_CUSTOM_PDF_LOGO = 'xpackReporting:customPdfLogo';
export const UI_SETTINGS_DATEFORMAT_TZ = 'dateFormat:tz';
export const CSV_REPORTING_ACTION = 'downloadCsvReport';

export const CSV_JOB_TYPE = 'csv_searchsource';
export const CSV_REPORT_TYPE_V2 = 'csv_v2';

export const CSV_SEARCHSOURCE_IMMEDIATE_TYPE = 'csv_searchsource_immediate';
// Licenses
export const LICENSE_TYPE_TRIAL = 'trial' as const;
export const LICENSE_TYPE_BASIC = 'basic' as const;
export const LICENSE_TYPE_CLOUD_STANDARD = 'standard' as const;
export const LICENSE_TYPE_GOLD = 'gold' as const;
export const LICENSE_TYPE_PLATINUM = 'platinum' as const;
export const LICENSE_TYPE_ENTERPRISE = 'enterprise' as const;

export const PDF_JOB_TYPE_V2 = 'printable_pdf_v2';
export const PDF_REPORT_TYPE_V2 = 'printablePdfV2';

export const PDF_JOB_TYPE = 'printable_pdf';

export const PNG_JOB_TYPE = 'PNG';
export const PNG_JOB_TYPE_V2 = 'PNGV2';
export const USES_HEADLESS_JOB_TYPES = [
  PDF_JOB_TYPE,
  PNG_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PNG_JOB_TYPE_V2,
];

type JobTypeDeclaration = typeof jobTypes;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];
