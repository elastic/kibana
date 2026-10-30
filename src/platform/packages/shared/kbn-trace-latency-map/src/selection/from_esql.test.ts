/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSelectionCondition, parseSelectionCondition } from './from_esql';
import { selectionToEsqlCondition } from './to_esql';

const selection = {
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDurationUs: 1000,
  maxDurationUs: 5000,
};

describe('parseSelectionCondition', () => {
  it('reads back the selection of a condition selectionToEsqlCondition wrote', () => {
    expect(parseSelectionCondition(selectionToEsqlCondition(selection))).toEqual(selection);
  });

  it('reads back a selection about failures', () => {
    const failed = { ...selection, failedOnly: true };
    expect(parseSelectionCondition(selectionToEsqlCondition(failed))).toEqual(failed);
  });

  it('keeps the fraction of a committed cell edge, from the written nanoseconds', () => {
    const condition = selectionToEsqlCondition({ ...selection, minDurationUs: 1000.2 });
    const parsed = parseSelectionCondition(condition);
    expect(parsed?.minDurationUs).toBeCloseTo(1000.2, 2);
    // The parsed selection writes the same condition back.
    expect(selectionToEsqlCondition(parsed!)).toBe(condition);
  });

  it('does not read a per-trace condition, whose root-span clause it cannot rebuild', () => {
    expect(
      parseSelectionCondition(selectionToEsqlCondition(selection, { unit: 'traces' }))
    ).toBeUndefined();
  });

  it('does not read a scoped condition, whose scope it would lose', () => {
    expect(
      parseSelectionCondition(
        selectionToEsqlCondition(selection, { scope: 'service.name == "cart"' })
      )
    ).toBeUndefined();
  });

  it('does not read an ordinary filter', () => {
    expect(parseSelectionCondition('service.name == "cart"')).toBeUndefined();
  });

  it('does not read a hand-edited condition, where the families no longer agree', () => {
    const edited = selectionToEsqlCondition(selection).replace(
      'span.duration.us >= 1000',
      'span.duration.us >= 999'
    );
    expect(parseSelectionCondition(edited)).toBeUndefined();
  });

  it('does not read a condition with an unreadable timestamp', () => {
    const edited = selectionToEsqlCondition(selection).replace(
      '2026-10-26T10:00:00.000Z',
      'now-15m'
    );
    expect(parseSelectionCondition(edited)).toBeUndefined();
  });
});

describe('isSelectionCondition', () => {
  it('tells conditions this package wrote from the rest of a query', () => {
    expect(isSelectionCondition(selectionToEsqlCondition(selection))).toBe(true);
    expect(isSelectionCondition('KQL("service.name: cart")')).toBe(false);
  });
});
