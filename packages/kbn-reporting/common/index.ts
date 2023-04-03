/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { CancellationToken } from './cancellation_token';
export { byteSizeValueToNumber } from './schema_utils';
export type { TaskRunMetrics, CsvMetrics } from './metrics';

export const CONTENT_TYPE_CSV = 'text/csv';
export const CSV_BOM_CHARS = '\ufeff';
export const UI_SETTINGS_CSV_SEPARATOR = 'csv:separator';
export const UI_SETTINGS_CSV_QUOTE_VALUES = 'csv:quoteValues';
export const UI_SETTINGS_DATEFORMAT_TZ = 'dateFormat:tz';

export const UI_SETTINGS_SEARCH_INCLUDE_FROZEN = 'search:includeFrozen';
export const UI_SETTINGS_CUSTOM_PDF_LOGO = 'xpackReporting:customPdfLogo';

export * as errors from './errors';
export * from './errors/map_to_reporting_error';
export * from './schema_utils';
