/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

interface BaseParamsCSV {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;

/**
 * Public-facing interface
 * Apps should use this interface to build job params. The browserTimezone and version
 * fields become automatically provided by Reporting
 * @public
 */
export type JobAppParamsCSV = Omit<JobParamsCSV, 'browserTimezone' | 'version'>;

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

export const CSV_REPORTING_ACTION = 'generateCsvReport';

/**
 * @deprecated
 * Supported in case older reports exist in storage
 */
export const CSV_JOB_TYPE_DEPRECATED = 'csv';

export { getQueryFromCsvJob, type QueryInspection } from './lib/get_query_from_job';
