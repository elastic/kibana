/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkWorkflowEntry } from './bulk_id_helpers';
import { deduplicateUserIds, partitionByIdSource, removeConflictingIds } from './bulk_id_helpers';

const makeEntry = (overrides: Partial<BulkWorkflowEntry> & { id: string }): BulkWorkflowEntry => ({
  idx: 0,
  idSource: 'server-generated' as const,
  workflowData: {} as BulkWorkflowEntry['workflowData'],
  ...overrides,
});

describe('partitionByIdSource', () => {
  it('should partition a mixed batch into serverGenerated and userSupplied', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'server-gen', idSource: 'server-generated' as const }),
      makeEntry({ idx: 1, id: 'user-id', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 2, id: 'another-server', idSource: 'server-generated' as const }),
    ];

    const { serverGenerated, userSupplied } = partitionByIdSource(workflows);

    expect(serverGenerated).toHaveLength(2);
    expect(serverGenerated[0].id).toBe('server-gen');
    expect(serverGenerated[1].id).toBe('another-server');
    expect(userSupplied).toHaveLength(1);
    expect(userSupplied[0].id).toBe('user-id');
  });

  it('should return all entries as serverGenerated when none have custom IDs', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'server-generated' as const }),
      makeEntry({ idx: 1, id: 'b', idSource: 'server-generated' as const }),
    ];

    const { serverGenerated, userSupplied } = partitionByIdSource(workflows);

    expect(serverGenerated).toHaveLength(2);
    expect(userSupplied).toHaveLength(0);
  });

  it('should return all entries as userSupplied when all have custom IDs', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'b', idSource: 'user-supplied' as const }),
    ];

    const { serverGenerated, userSupplied } = partitionByIdSource(workflows);

    expect(serverGenerated).toHaveLength(0);
    expect(userSupplied).toHaveLength(2);
  });

  it('should return empty arrays for empty input', () => {
    const { serverGenerated, userSupplied } = partitionByIdSource([]);

    expect(serverGenerated).toHaveLength(0);
    expect(userSupplied).toHaveLength(0);
  });

  it('should not mutate the input array', () => {
    const workflows = [makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const })];
    const original = [...workflows];

    partitionByIdSource(workflows);

    expect(workflows).toEqual(original);
  });
});

describe('removeConflictingIds', () => {
  it('should remove entries whose user-supplied ID exists in the set', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'existing', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'new-one', idSource: 'user-supplied' as const }),
    ];
    const existingIds = new Set(['existing']);

    const { kept, removed } = removeConflictingIds(workflows, existingIds);

    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('new-one');
    expect(removed).toHaveLength(1);
    expect(removed[0]).toEqual({
      index: 0,
      id: 'existing',
      error: "Workflow with id 'existing' already exists",
    });
  });

  it('should keep all entries when none conflict', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'b', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = removeConflictingIds(workflows, new Set());

    expect(kept).toHaveLength(2);
    expect(removed).toHaveLength(0);
  });

  it('should remove all entries when all conflict', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'b', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = removeConflictingIds(workflows, new Set(['a', 'b']));

    expect(kept).toHaveLength(0);
    expect(removed).toHaveLength(2);
  });

  it('should pass through server-generated entries unconditionally', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'server-gen', idSource: 'server-generated' as const }),
      makeEntry({ idx: 1, id: 'user-conflict', idSource: 'user-supplied' as const }),
    ];
    const existingIds = new Set(['server-gen', 'user-conflict']);

    const { kept, removed } = removeConflictingIds(workflows, existingIds);

    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('server-gen');
    expect(removed).toHaveLength(1);
    expect(removed[0].id).toBe('user-conflict');
  });

  it('should remove all duplicates of a conflicting ID', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'dup', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'dup', idSource: 'user-supplied' as const }),
    ];
    const existingIds = new Set(['dup']);

    const { kept, removed } = removeConflictingIds(workflows, existingIds);

    expect(kept).toHaveLength(0);
    expect(removed).toHaveLength(2);
  });

  it('should not mutate the input array', () => {
    const workflows = [makeEntry({ idx: 0, id: 'existing', idSource: 'user-supplied' as const })];
    const original = [...workflows];

    removeConflictingIds(workflows, new Set(['existing']));

    expect(workflows).toEqual(original);
  });
});

describe('deduplicateUserIds', () => {
  it('should keep all entries when there are no duplicates', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'b', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = deduplicateUserIds(workflows);

    expect(kept).toHaveLength(2);
    expect(removed).toHaveLength(0);
  });

  it('should keep the first occurrence and remove later duplicates', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'same', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'same', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = deduplicateUserIds(workflows);

    expect(kept).toHaveLength(1);
    expect(kept[0].idx).toBe(0);
    expect(removed).toHaveLength(1);
    expect(removed[0]).toEqual({
      index: 1,
      id: 'same',
      error: "Duplicate workflow id 'same' in batch",
    });
  });

  it('should keep only the first of three duplicates', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'triple', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'triple', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 2, id: 'triple', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = deduplicateUserIds(workflows);

    expect(kept).toHaveLength(1);
    expect(kept[0].idx).toBe(0);
    expect(removed).toHaveLength(2);
    expect(removed[0].index).toBe(1);
    expect(removed[1].index).toBe(2);
  });

  it('should never flag server-generated entries as duplicates', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'same-slug', idSource: 'server-generated' as const }),
      makeEntry({ idx: 1, id: 'same-slug', idSource: 'server-generated' as const }),
    ];

    const { kept, removed } = deduplicateUserIds(workflows);

    expect(kept).toHaveLength(2);
    expect(removed).toHaveLength(0);
  });

  it('should handle mixed user-supplied and server-generated entries', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'my-id', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'server-gen', idSource: 'server-generated' as const }),
      makeEntry({ idx: 2, id: 'my-id', idSource: 'user-supplied' as const }),
    ];

    const { kept, removed } = deduplicateUserIds(workflows);

    expect(kept).toHaveLength(2);
    expect(kept[0].idx).toBe(0);
    expect(kept[1].idx).toBe(1);
    expect(removed).toHaveLength(1);
    expect(removed[0].index).toBe(2);
  });

  it('should not mutate the input array', () => {
    const workflows = [
      makeEntry({ idx: 0, id: 'a', idSource: 'user-supplied' as const }),
      makeEntry({ idx: 1, id: 'a', idSource: 'user-supplied' as const }),
    ];
    const original = [...workflows];

    deduplicateUserIds(workflows);

    expect(workflows).toEqual(original);
  });
});
