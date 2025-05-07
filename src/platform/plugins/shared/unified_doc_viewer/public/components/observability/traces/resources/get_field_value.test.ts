/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTraceDocValue } from './get_field_value';
import { DataTableRecord, TraceDocumentOverview } from '@kbn/discover-utils';

describe('getTraceDocValue', () => {
  it('returns the first value of the specified field as the correct type', () => {
    const field = 'traceId' as keyof TraceDocumentOverview;
    const flattened: DataTableRecord['flattened'] = {
      traceId: ['abc123', 'def456'],
    };

    const result = getTraceDocValue(field, flattened);

    expect(result).toBe('abc123');
  });

  it('returns undefined if the field does not exist in the flattened object', () => {
    const field = 'traceId' as keyof TraceDocumentOverview;
    const flattened: DataTableRecord['flattened'] = {};

    const result = getTraceDocValue(field, flattened);

    expect(result).toBeUndefined();
  });

  it('handles non-array values by casting them to an array and returning the first value', () => {
    const field = 'traceId' as keyof TraceDocumentOverview;
    const flattened: DataTableRecord['flattened'] = {
      traceId: 'abc123',
    };

    const result = getTraceDocValue(field, flattened);

    expect(result).toBe('abc123');
  });
});
