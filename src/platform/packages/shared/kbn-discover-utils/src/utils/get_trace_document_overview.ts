/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { DataTableRecord, TraceDocumentOverview, fieldConstants } from '../..';

export function getTraceDocumentOverview(doc: DataTableRecord): TraceDocumentOverview {
  const formatField = <T extends keyof TraceDocumentOverview>(field: T) =>
    castArray(doc.flattened[field])[0] as TraceDocumentOverview[T];

  const fields: Array<keyof TraceDocumentOverview> = [
    'parent_span_id',
    'trace_id',
    'name',
    'duration',
    'status.code',
    'status.description',
    'kind',
    'span_id',
    'trace_state',
  ];

  return fields.reduce((acc, field) => {
    acc[field] = formatField(field);
    return acc;
  }, {} as { [key in keyof TraceDocumentOverview]?: string | number }) as TraceDocumentOverview;
}
