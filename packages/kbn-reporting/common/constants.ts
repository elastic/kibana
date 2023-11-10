/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { jobTypes } from './job_types';

export const PLUGIN_ID = 'reporting';

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

export const USES_HEADLESS_JOB_TYPES = [
  jobTypes.PDF_JOB_TYPE,
  jobTypes.PNG_JOB_TYPE,
  jobTypes.PDF_JOB_TYPE_V2,
  jobTypes.PNG_JOB_TYPE_V2,
];

type JobTypeDeclaration = typeof jobTypes;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];

/**
 * A way to get the client side route for the reporting redirect app.
 *
 * TODO: Add a job ID and a locator to use so that we can redirect without expecting state to
 * be injected to the page
 */
export const getRedirectAppPath = () => {
  return '/app/reportingRedirect';
};
