/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DatatableColumn,
  DatatableRow,
  DatatableColumnMeta,
} from '@kbn/expressions-plugin/common';
import type { FieldFormatsContentType } from '@kbn/field-formats-plugin/common';

export interface MultiTermFormatter {
  convert: (value: any, contentType?: FieldFormatsContentType) => string;
}

export interface EsqlMultiTermTransformInput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  query?: string;
  formatter?: MultiTermFormatter;
}

export interface EsqlMultiTermTransformOutput {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  transformed: boolean;
  newColumnName: string | null;
  originalStringColumns: DatatableColumn[];
}

export interface DatatableColumnMetaWithOriginalStringColumns extends DatatableColumnMeta {
  originalStringColumns: DatatableColumn[];
  originalValueLookup: Map<string, Record<string, unknown>>;
}
