/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';

export interface FakeRequest {
  headers: Record<string, string>;
}

export interface JobParamsDownloadCSV {
  browserTimezone: string;
  title: string;
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

export interface SavedObjectServiceError {
  statusCode: number;
  error?: string;
  message?: string;
}
