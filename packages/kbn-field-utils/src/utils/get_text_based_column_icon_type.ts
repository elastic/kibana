/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { getFieldIconType } from './get_field_icon_type';

export function getTextBasedColumnIconType(
  columnMeta:
    | {
        type: DatatableColumnMeta['type'];
        esType?: DatatableColumnMeta['esType'];
      }
    | undefined
    | null
): string | null {
  return columnMeta && columnMeta.type
    ? getFieldIconType(
        convertDatatableColumnToDataViewFieldSpec({ id: '', name: '', meta: columnMeta })
      )
    : null;
}
