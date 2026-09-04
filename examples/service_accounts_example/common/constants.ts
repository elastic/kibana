/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const APP_ID = 'serviceAccountsExample';
export const APP_TITLE = 'Service Accounts';
export const OPERATION_TYPE = 'sa_example';
export const WORKLOAD_TYPE = 'job';
export const JOB_SAVED_OBJECT_TYPE = 'sa_example_job';

export const API_BASE = '/internal/service_accounts_example';
export const STATUS_PATH = `${API_BASE}/status`;
export const CREATE_PATH = `${API_BASE}/accounts`;
export const JOBS_PATH = `${API_BASE}/jobs`;
export const JOB_PATH = `${API_BASE}/jobs/{id}`;
export const JOB_ATTACH_PATH = `${API_BASE}/jobs/{id}/attach`;
export const JOB_DETACH_PATH = `${API_BASE}/jobs/{id}/detach`;
export const JOB_RUN_PATH = `${API_BASE}/jobs/{id}/run`;
export const WHOAMI_PATH = `${API_BASE}/whoami`;

export const SECURITY_SERVICE_ACCOUNT_PATH = '/internal/security/service_account';
