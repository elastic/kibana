/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '../types';
import { formatFieldValue } from './format_value';

export function getFormattedFields<T>(
  doc: DataTableRecord,
  fields: Array<keyof T>,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): T {
  const formatField = <K extends keyof T>(field: K) => {
    const fieldStr = field as string;
    return doc.flattened[fieldStr] !== undefined && doc.flattened[fieldStr] !== null
      ? (formatFieldValue(
          doc.flattened[fieldStr],
          doc.raw,
          fieldFormats,
          dataView,
          dataView.fields.getByName(fieldStr)
        ) as T[K])
      : undefined;
  };

  return fields.reduce<{ [ket in keyof T]?: string | number }>((acc, field) => {
    acc[field] = formatField(field) as string | number | undefined;
    return acc;
  }, {}) as T;
}
