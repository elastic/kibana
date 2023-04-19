/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';

export interface JobParams {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
  browserTimezone?: string;
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
