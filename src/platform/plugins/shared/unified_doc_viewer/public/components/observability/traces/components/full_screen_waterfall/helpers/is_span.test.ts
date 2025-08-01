/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROCESSOR_EVENT_FIELD, DataTableRecord } from '@kbn/discover-utils';
import { isSpanHit } from './is_span';

describe('isSpanHit', () => {
  it('returns false when hit.flattened is null', () => {
    const hit = {
      flattened: null,
    } as unknown as DataTableRecord;

    expect(isSpanHit(hit)).toBe(false);
  });

  it('returns true when processorEvent is null (OTEL fallback)', () => {
    const hit = {
      flattened: {
        [PROCESSOR_EVENT_FIELD]: null,
      },
    } as unknown as DataTableRecord;

    expect(isSpanHit(hit)).toBe(true);
  });

  it('returns true for an APM span (processorEvent === "span")', () => {
    const hit = {
      flattened: {
        [PROCESSOR_EVENT_FIELD]: 'span',
      },
    } as unknown as DataTableRecord;

    expect(isSpanHit(hit)).toBe(true);
  });

  it('returns false when processorEvent is not "span" ', () => {
    const hit = {
      flattened: {
        [PROCESSOR_EVENT_FIELD]: 'transaction',
      },
    } as unknown as DataTableRecord;

    expect(isSpanHit(hit)).toBe(false);
  });
});
