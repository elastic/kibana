/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type {
  BaseParams,
  BaseParamsV2,
  BasePayload,
  BasePayloadV2,
  CsvPagingStrategy,
} from '@kbn/reporting-common/types';

export * from './constants';

export interface JobParamsDownloadCSV {
  browserTimezone: string;
  title: string;
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

interface BaseParamsCSV {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;

interface CsvFromSavedObjectBase {
  objectType: 'search';
}

/**
 * Makes title optional, as it can be derived from the saved search object
 */
export type JobParamsCsvFromSavedObject = CsvFromSavedObjectBase &
  Omit<BaseParamsV2, 'title'> & { title?: string };

export interface TaskPayloadCsvFromSavedObject extends CsvFromSavedObjectBase, BasePayloadV2 {
  objectType: 'search';
  pagingStrategy: CsvPagingStrategy;
}

export const CSV_REPORTING_ACTION = 'downloadCsvReport';

export const CSV_SEARCHSOURCE_IMMEDIATE_TYPE = 'csv_searchsource_immediate';

// This is deprecated because it lacks support for runtime fields
// but the extension points are still needed for pre-existing scripted automation, until 8.0
export const CSV_REPORT_TYPE_DEPRECATED = 'CSV';
export const CSV_JOB_TYPE_DEPRECATED = 'csv';

export { getQueryFromCsvJob, type QueryInspection } from './lib/get_query_from_job';
