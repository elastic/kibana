/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseInterceptedWarning } from '@kbn/search-response-warnings';

export type ValueToStringConverter = (
  rowIndex: number,
  columnId: string,
  options?: { compatibleWithCSV?: boolean }
) => { formattedString: string; withFormula: boolean };

export interface RecordsFetchResponse {
  records: DataTableRecord[];
  textBasedQueryColumns?: DatatableColumn[];
  textBasedHeaderWarning?: string;
  interceptedWarnings?: SearchResponseInterceptedWarning[];
}
