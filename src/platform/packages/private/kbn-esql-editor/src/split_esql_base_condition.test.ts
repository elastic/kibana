/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findEsqlConditionStartOffset,
  getActiveConditionInterval,
  getAlertRuleCopySegments,
  getAlertRuleSplitPlan,
} from './split_esql_base_condition';

describe('getAlertRuleSplitPlan', () => {
  it('uses automatic | WHERE when override is null', () => {
    const q = 'FROM a | WHERE x > 1';
    const plan = getAlertRuleSplitPlan(q, null);
    expect(plan.kind).toBe('split');
    if (plan.kind === 'split') {
      expect(q.slice(plan.conditionStartOffset)).toMatch(/^\|\s*WHERE/i);
    }
  });

  it('returns range when override selects a substring', () => {
    const q = 'FROM a | STATS b = COUNT(*) | WHERE c > 1';
    const plan = getAlertRuleSplitPlan(q, { start: 5, end: 12 });
    expect(plan.kind).toBe('range');
    if (plan.kind === 'range') {
      expect(plan.conditionStart).toBe(5);
      expect(plan.conditionEnd).toBe(12);
    }
  });

  it('returns all-condition when override spans full query', () => {
    const q = 'FROM a';
    expect(getAlertRuleSplitPlan(q, { start: 0, end: q.length }).kind).toBe('all-condition');
  });

  it('normalizes reversed start/end on override', () => {
    const q = '0123456789';
    const plan = getAlertRuleSplitPlan(q, { start: 7, end: 3 });
    expect(plan.kind).toBe('range');
    if (plan.kind === 'range') {
      expect(plan.conditionStart).toBe(3);
      expect(plan.conditionEnd).toBe(7);
    }
  });
});

describe('getActiveConditionInterval', () => {
  it('returns [| WHERE …, EOF) for automatic split', () => {
    const q = 'FROM a\n| WHERE x > 1';
    const iv = getActiveConditionInterval(q, null);
    expect(iv).not.toBeNull();
    expect(q.slice(iv!.start, iv!.end)).toMatch(/^\|\s*WHERE[\s\S]*/i);
  });

  it('returns null for all-base (no WHERE)', () => {
    expect(getActiveConditionInterval('FROM a | STATS c = COUNT(*)', null)).toBeNull();
  });

  it('returns manual range when override is set', () => {
    const q = '0123456789';
    const iv = getActiveConditionInterval(q, { start: 2, end: 5 });
    expect(iv).toEqual({ start: 2, end: 5 });
  });
});

describe('getAlertRuleCopySegments', () => {
  it('splits automatic | WHERE into base and condition text', () => {
    const q = 'FROM a | WHERE x > 1';
    const { baseText, conditionText } = getAlertRuleCopySegments(q, null);
    expect(baseText).toBe('FROM a ');
    expect(conditionText).toBe('| WHERE x > 1');
  });

  it('concatenates prefix and suffix for range plan base text', () => {
    const q = '0123456789';
    const { baseText, conditionText } = getAlertRuleCopySegments(q, { start: 3, end: 7 });
    expect(baseText).toBe('012789');
    expect(conditionText).toBe('3456');
  });

  it('returns full query as base when there is no condition', () => {
    const q = 'FROM a | STATS c = COUNT(*)';
    const { baseText, conditionText } = getAlertRuleCopySegments(q, null);
    expect(baseText).toBe(q);
    expect(conditionText).toBe('');
  });
});

describe('findEsqlConditionStartOffset', () => {
  it('returns the index of | before WHERE for a typical query', () => {
    const q = `FROM kibana_sample_data_flights
| STATS count = COUNT(*) BY DestCityName
| WHERE DestCityName == "Barcelona"`;
    const idx = findEsqlConditionStartOffset(q);
    expect(idx).not.toBeNull();
    expect(q.slice(idx!, idx! + 20)).toMatch(/^\|\s*WHERE/i);
  });

  it('returns null when there is no WHERE pipeline stage', () => {
    expect(findEsqlConditionStartOffset('FROM foo | STATS c = COUNT(*)')).toBeNull();
  });

  it('is case-insensitive on WHERE', () => {
    const q = 'FROM a | where x > 1';
    const idx = findEsqlConditionStartOffset(q);
    expect(idx).not.toBeNull();
    expect(q.slice(idx!)).toMatch(/^\|\s*where/i);
  });
});
