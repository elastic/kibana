/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListDto, WorkflowListItemDto } from '@kbn/workflows';
import { areSimilarResults, keepPreviousWorkflowOrder } from './workflow_utils';

const makeItem = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'w1',
  name: 'Workflow 1',
  description: '',
  enabled: true,
  definition: null,
  createdAt: '2026-01-01T00:00:00Z',
  history: [],
  valid: true,
  ...overrides,
});

const makeListDto = (items: WorkflowListItemDto[]): WorkflowListDto => ({
  page: 1,
  size: 10,
  total: items.length,
  results: items,
});

describe('areSimilarResults', () => {
  it('returns false when either argument is undefined', () => {
    const list = makeListDto([makeItem()]);
    expect(areSimilarResults(undefined, list)).toBe(false);
    expect(areSimilarResults(list, undefined)).toBe(false);
    expect(areSimilarResults(undefined, undefined)).toBe(false);
  });

  it('returns true when results are identical (ignoring lastUpdatedAt)', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    const oldList = makeListDto(items);
    const newList = makeListDto(items);
    expect(areSimilarResults(newList, oldList)).toBe(true);
  });

  it('returns false when result counts differ', () => {
    const oldList = makeListDto([makeItem({ id: 'a' })]);
    const newList = makeListDto([makeItem({ id: 'a' }), makeItem({ id: 'b' })]);
    expect(areSimilarResults(newList, oldList)).toBe(false);
  });

  it('returns false when a result id is missing from the old set', () => {
    const oldList = makeListDto([makeItem({ id: 'a' })]);
    const newList = makeListDto([makeItem({ id: 'b' })]);
    expect(areSimilarResults(newList, oldList)).toBe(false);
  });

  it('returns true when only lastUpdatedAt differs', () => {
    const item = makeItem({ id: 'a' });
    // Cast needed: API responses include extra fields (lastUpdatedAt, yaml) not in WorkflowListItemDto
    const oldList = makeListDto([{ ...item, lastUpdatedAt: '2026-01-01' } as WorkflowListItemDto]);
    const newList = makeListDto([{ ...item, lastUpdatedAt: '2026-02-01' } as WorkflowListItemDto]);
    expect(areSimilarResults(newList, oldList)).toBe(true);
  });

  it('returns true when enabled toggled and yaml length changed by 1', () => {
    // Cast needed: yaml is present at runtime but not in WorkflowListItemDto
    const oldItem = { ...makeItem({ id: 'a', enabled: true }), yaml: 'enabled: true' };
    const newItem = { ...makeItem({ id: 'a', enabled: false }), yaml: 'enabled: false' };
    expect(
      areSimilarResults(
        makeListDto([newItem] as WorkflowListItemDto[]),
        makeListDto([oldItem] as WorkflowListItemDto[])
      )
    ).toBe(true);
  });

  it('returns false when enabled toggled but yaml length delta is not 1', () => {
    const oldItem = { ...makeItem({ id: 'a', enabled: true }), yaml: 'on' };
    const newItem = { ...makeItem({ id: 'a', enabled: false }), yaml: 'completely-different' };
    expect(
      areSimilarResults(
        makeListDto([newItem] as WorkflowListItemDto[]),
        makeListDto([oldItem] as WorkflowListItemDto[])
      )
    ).toBe(false);
  });

  it('returns true for empty result sets', () => {
    const oldList = makeListDto([]);
    const newList = makeListDto([]);
    expect(areSimilarResults(newList, oldList)).toBe(true);
  });
});

describe('keepPreviousWorkflowOrder', () => {
  it('sorts freshData results to match previousData order', () => {
    const a = makeItem({ id: 'a', name: 'A' });
    const b = makeItem({ id: 'b', name: 'B' });
    const c = makeItem({ id: 'c', name: 'C' });

    const previousData = makeListDto([a, b, c]);
    const freshData = makeListDto([c, a, b]);

    const result = keepPreviousWorkflowOrder({ previousData, freshData });
    expect(result.results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns a new object without mutating freshData', () => {
    const a = makeItem({ id: 'a' });
    const b = makeItem({ id: 'b' });

    const previousData = makeListDto([b, a]);
    const freshData = makeListDto([a, b]);
    const originalOrder = [...freshData.results];

    const result = keepPreviousWorkflowOrder({ previousData, freshData });

    expect(result).not.toBe(freshData);
    expect(result.results).not.toBe(freshData.results);
    expect(freshData.results).toEqual(originalOrder);
  });

  it('places items not in previousData at the end', () => {
    const a = makeItem({ id: 'a', name: 'A' });
    const b = makeItem({ id: 'b', name: 'B' });
    const newItem = makeItem({ id: 'new', name: 'New' });

    const previousData = makeListDto([b, a]);
    const freshData = makeListDto([newItem, a, b]);

    const result = keepPreviousWorkflowOrder({ previousData, freshData });
    expect(result.results.map((r) => r.id)).toEqual(['b', 'a', 'new']);
  });

  it('handles empty results', () => {
    const previousData = makeListDto([]);
    const freshData = makeListDto([]);

    const result = keepPreviousWorkflowOrder({ previousData, freshData });
    expect(result.results).toEqual([]);
  });

  it('handles single item', () => {
    const a = makeItem({ id: 'a' });

    const previousData = makeListDto([a]);
    const freshData = makeListDto([a]);

    const result = keepPreviousWorkflowOrder({ previousData, freshData });
    expect(result.results).toEqual([a]);
  });

  it('preserves other WorkflowListDto properties', () => {
    const a = makeItem({ id: 'a' });
    const previousData = makeListDto([a]);
    const freshData: WorkflowListDto = { page: 3, size: 25, total: 100, results: [a] };

    const result = keepPreviousWorkflowOrder({ previousData, freshData });
    expect(result.page).toBe(3);
    expect(result.size).toBe(25);
    expect(result.total).toBe(100);
  });
});
