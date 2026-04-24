/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '../types';
import { formatFieldValueReact } from './format_value';

export function getFormattedFields<T>(
  doc: DataTableRecord,
  fields: Array<keyof T>,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): { [K in keyof T]?: ReactNode } {
  const formatField = (field: keyof T): ReactNode => {
    const fieldStr = field as string;
    return doc.flattened[fieldStr] !== undefined && doc.flattened[fieldStr] !== null
      ? formatFieldValueReact({
          value: doc.flattened[fieldStr],
          hit: doc.raw,
          fieldFormats,
          dataView,
          field: dataView.fields.getByName(fieldStr),
        })
      : undefined;
  };

  return fields.reduce<{ [K in keyof T]?: ReactNode }>((acc, field) => {
    acc[field] = formatField(field);
    return acc;
  }, {});
}
