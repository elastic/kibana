/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormat, FormatFactory } from '@kbn/field-formats-plugin/common';
import type { PointEventAnnotationRow } from '@kbn/event-annotation-plugin/common';

export const getExtraFields = (
  row: PointEventAnnotationRow,
  formatFactory: FormatFactory,
  columns: DatatableColumn[] | undefined
): Array<{
  key: string;
  name: string;
  formatter: FieldFormat | undefined;
}> => {
  return Object.keys(row)
    .filter((key) => key.startsWith('field:'))
    .map((key) => {
      const column = columns?.find((c) => c.id === key);
      return {
        key,
        name: column?.name || key.replace('field:', ''),
        formatter: column?.meta?.params && formatFactory(column.meta.params),
      };
    });
};
