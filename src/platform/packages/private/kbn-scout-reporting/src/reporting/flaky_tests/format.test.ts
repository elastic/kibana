/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flakiestBranch, formatAge, formatRate } from './format';
import type { FlakyTestBranchStats } from './schema';

const now = new Date('2026-09-07T12:00:00.000Z');

const branch = (
  overrides: Partial<FlakyTestBranchStats> & { branch: string }
): FlakyTestBranchStats => ({
  builds: 10,
  failedBuilds: 1,
  buildFailRate: 0.1,
  ...overrides,
});

describe('formatAge', () => {
  it.each([
    ['2026-09-07T11:55:00.000Z', '5m ago'],
    ['2026-09-07T09:00:00.000Z', '3h ago'],
    ['2026-09-05T12:00:00.000Z', '2d ago'],
  ])('formats %s as %s', (timestamp, expected) => {
    expect(formatAge(new Date(timestamp), now)).toBe(expected);
  });

  it('never reports a negative age', () => {
    expect(formatAge(new Date('2026-09-07T12:05:00.000Z'), now)).toBe('0m ago');
  });
});

describe('formatRate', () => {
  it('renders a ratio as a percentage with one decimal', () => {
    expect(formatRate(0.096)).toBe('9.6%');
    expect(formatRate(1)).toBe('100.0%');
  });
});

describe('flakiestBranch', () => {
  it('returns undefined when there are no branches', () => {
    expect(flakiestBranch([], 10)).toBeUndefined();
  });

  it('prefers the highest fail rate among branches with enough builds', () => {
    const picked = flakiestBranch(
      [
        branch({ branch: 'main', builds: 50, buildFailRate: 0.1 }),
        branch({ branch: '9.2', builds: 20, buildFailRate: 0.3 }),
        branch({ branch: 'feature', builds: 1, buildFailRate: 1 }),
      ],
      10
    );
    expect(picked?.branch).toBe('9.2');
  });

  it('falls back to all branches when none has enough builds', () => {
    const picked = flakiestBranch(
      [
        branch({ branch: 'main', builds: 3, buildFailRate: 0.33 }),
        branch({ branch: '9.2', builds: 2, buildFailRate: 0.5 }),
      ],
      10
    );
    expect(picked?.branch).toBe('9.2');
  });
});
