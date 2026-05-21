/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMemoryHistory } from 'history';
import { claimUrlSyncSlot } from './coordinator';

describe('claimUrlSyncSlot', () => {
  it('grants the primary slot to the first claim on a history', () => {
    const history = createMemoryHistory();

    const claim = claimUrlSyncSlot(history);

    expect(claim.isPrimary).toBe(true);
  });

  it('grants secondary slots to subsequent claims and surfaces the primary label', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history, 'dashboards');
    const second = claimUrlSyncSlot(history, 'visualizations');
    const third = claimUrlSyncSlot(history, 'recents');

    expect(first.isPrimary).toBe(true);
    expect(first.primaryLabel).toBe('dashboards');
    expect(second.isPrimary).toBe(false);
    expect(second.primaryLabel).toBe('dashboards');
    expect(third.isPrimary).toBe(false);
    expect(third.primaryLabel).toBe('dashboards');
  });

  it('frees the primary slot when the primary releases, so the next claim becomes primary', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history, 'dashboards');
    const second = claimUrlSyncSlot(history, 'visualizations');
    expect(second.isPrimary).toBe(false);

    first.release();

    const third = claimUrlSyncSlot(history, 'recents');
    expect(third.isPrimary).toBe(true);
    expect(third.primaryLabel).toBe('recents');
  });

  it('does not promote existing secondaries when the primary releases', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history, 'dashboards');
    const second = claimUrlSyncSlot(history, 'visualizations');

    first.release();

    expect(second.isPrimary).toBe(false);
  });

  it('cleans up the registry entry when all members release', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history, 'dashboards');
    const second = claimUrlSyncSlot(history, 'visualizations');

    first.release();
    second.release();

    // After full cleanup, a fresh claim should behave as the very first claim
    // on this history (own label, not the stale 'dashboards' label).
    const third = claimUrlSyncSlot(history, 'recents');
    expect(third.isPrimary).toBe(true);
    expect(third.primaryLabel).toBe('recents');
  });

  it('release is idempotent', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history, 'dashboards');
    first.release();
    first.release();

    const second = claimUrlSyncSlot(history, 'visualizations');
    expect(second.isPrimary).toBe(true);
    expect(second.primaryLabel).toBe('visualizations');
  });

  it('isolates slots per history instance', () => {
    const historyA = createMemoryHistory();
    const historyB = createMemoryHistory();

    const a = claimUrlSyncSlot(historyA, 'dashboards');
    const b = claimUrlSyncSlot(historyB, 'visualizations');

    expect(a.isPrimary).toBe(true);
    expect(b.isPrimary).toBe(true);
    expect(a.primaryLabel).toBe('dashboards');
    expect(b.primaryLabel).toBe('visualizations');
  });

  it('handles claims without a label', () => {
    const history = createMemoryHistory();

    const first = claimUrlSyncSlot(history);
    const second = claimUrlSyncSlot(history);

    expect(first.isPrimary).toBe(true);
    expect(first.primaryLabel).toBeUndefined();
    expect(second.isPrimary).toBe(false);
    expect(second.primaryLabel).toBeUndefined();
  });
});
