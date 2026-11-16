/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFieldUse, markReturned, trackFieldUse } from './field_use';

const body = () => ({
  id: 1,
  state: 'opened',
  owner: { login: 'octo', avatar: 'a.png' },
  labels: [{ name: 'bug', color: 'red' }],
});

const sorted = (set: Set<string>) => [...set].sort();

describe('trackFieldUse', () => {
  it('records the fields read, nested and in array elements, and missing ones', () => {
    const use = createFieldUse();
    const data = trackFieldUse(body(), use);

    expect(data.state).toBe('opened');
    expect(data.owner.login).toBe('octo');
    expect(data.labels.map(({ name }) => name)).toEqual(['bug']);
    expect((data as Record<string, unknown>).archived).toBeUndefined();

    expect(sorted(use.read)).toEqual([
      'archived',
      'labels',
      'labels/items',
      'labels/items/name',
      'owner',
      'owner/login',
      'state',
    ]);
    expect(use.copied.size).toBe(0);
  });

  it('records `in` checks as reads', () => {
    const use = createFieldUse();
    const data = trackFieldUse(body(), use);

    expect('owner' in data).toBe(true);
    expect(use.read).toEqual(new Set(['owner']));
  });

  it('records a spread or JSON.stringify as copies, not reads', () => {
    const use = createFieldUse();
    const data = trackFieldUse(body(), use);

    const copy = { ...data };
    JSON.stringify(data.labels);

    expect(copy.state).toBe('opened');
    expect(use.read).toEqual(new Set(['labels', 'labels/items']));
    expect(sorted(use.copied)).toEqual(['', 'labels/items']);
  });

  it('ignores what every object answers, such as awaiting it or array methods', async () => {
    const use = createFieldUse();
    const data = trackFieldUse(body(), use);

    await Promise.resolve(data);
    expect(data.labels.length).toBe(1);
    expect(String(data.owner)).toBe('[object Object]');

    expect(use.read).toEqual(new Set(['labels', 'owner']));
  });

  it('leaves values other than parsed JSON alone', () => {
    const buffer = Buffer.from('x');
    expect(trackFieldUse(buffer, createFieldUse())).toBe(buffer);
    expect(trackFieldUse('text', createFieldUse())).toBe('text');
  });
});

describe('markReturned', () => {
  it('records tracked values a result holds as they were', () => {
    const use = createFieldUse();
    const data = trackFieldUse(body(), use);

    markReturned({ items: data.labels, total: 1 });
    markReturned(data);

    expect(sorted(use.returned)).toEqual(['', 'labels']);
  });
});
