/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { CancellationToken } from './cancellation_token';
export { AuthenticationExpiredError, ReportingError } from './errors';
export { byteSizeValueToNumber } from './schema_utils';

export const CONTENT_TYPE_CSV = 'text/csv';
export const CSV_REPORTING_ACTION = 'downloadCsvReport';
export const CSV_BOM_CHARS = '\ufeff';
export const CSV_FORMULA_CHARS = ['=', '+', '-', '@'];
