/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { BaseParams, BaseParamsV2, BasePayload, BasePayloadV2 } from '@kbn/reporting-common';

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

/**
 *
 */
export type TaskPayloadCsvFromSavedObject = CsvFromSavedObjectBase & BasePayloadV2;
