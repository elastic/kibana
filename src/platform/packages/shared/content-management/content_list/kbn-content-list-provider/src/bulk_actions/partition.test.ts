/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../item';
import { partitionByRestriction } from './partition';

const item = (id: string, extras: Partial<ContentListItem> = {}): ContentListItem => ({
  id,
  title: `Item ${id}`,
  ...extras,
});

describe('partitionByRestriction', () => {
  it('treats every item as permitted when no predicate is supplied', () => {
    const items = [item('1'), item('2'), item('3')];

    const result = partitionByRestriction(items);

    expect(result.permitted).toEqual(items);
    expect(result.skipped).toEqual([]);
  });

  it('returns a copy of the input array when no predicate is supplied', () => {
    const items = [item('1')];

    const result = partitionByRestriction(items);

    expect(result.permitted).not.toBe(items);
  });

  it('routes items with an `undefined` reason to `permitted`', () => {
    const items = [item('1'), item('2')];

    const result = partitionByRestriction(items, () => undefined);

    expect(result.permitted).toEqual(items);
    expect(result.skipped).toEqual([]);
  });

  it('routes items with a string reason to `skipped`', () => {
    const items = [item('1'), item('2')];

    const result = partitionByRestriction(items, () => 'Restricted');

    expect(result.permitted).toEqual([]);
    expect(result.skipped).toEqual([
      { item: items[0], reason: 'Restricted' },
      { item: items[1], reason: 'Restricted' },
    ]);
  });

  it('partitions a mixed selection by the predicate', () => {
    const items = [
      item('1', { managed: true }),
      item('2', { managed: false }),
      item('3', { managed: true }),
      item('4', { managed: false }),
    ];

    const result = partitionByRestriction(items, (i) =>
      i.managed ? 'Managed dashboards cannot be deleted.' : undefined
    );

    expect(result.permitted).toEqual([items[1], items[3]]);
    expect(result.skipped).toEqual([
      { item: items[0], reason: 'Managed dashboards cannot be deleted.' },
      { item: items[2], reason: 'Managed dashboards cannot be deleted.' },
    ]);
  });

  it('preserves input order within each subset', () => {
    const items = [
      item('a', { managed: true }),
      item('b', { managed: false }),
      item('c', { managed: true }),
      item('d', { managed: false }),
      item('e', { managed: true }),
    ];

    const result = partitionByRestriction(items, (i) => (i.managed ? 'restricted' : undefined));

    expect(result.permitted.map((i) => i.id)).toEqual(['b', 'd']);
    expect(result.skipped.map((s) => s.item.id)).toEqual(['a', 'c', 'e']);
  });

  it('returns empty subsets for an empty input', () => {
    const result = partitionByRestriction([], () => 'whatever');

    expect(result.permitted).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('lets the predicate return per-item reason strings', () => {
    const items = [item('1', { managed: true }), item('2', { type: 'system' })];

    const result = partitionByRestriction(items, (i: ContentListItem) => {
      if (i.managed) {
        return 'Managed';
      }
      if (i.type === 'system') {
        return 'System';
      }
      return undefined;
    });

    expect(result.permitted).toEqual([]);
    expect(result.skipped.map((s) => s.reason)).toEqual(['Managed', 'System']);
  });
});
