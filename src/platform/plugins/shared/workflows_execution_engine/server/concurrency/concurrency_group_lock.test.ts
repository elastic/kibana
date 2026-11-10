/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LockAcquisitionError } from '@kbn/lock-manager';

import {
  type ConcurrencyGroupLock,
  concurrencyGroupLockId,
  withConcurrencyGroupLock,
} from './concurrency_group_lock';

class FakeGroupLock implements ConcurrencyGroupLock {
  private readonly held = new Set<string>();

  async withLock<T>(lockId: string, callback: () => Promise<T>): Promise<T> {
    if (this.held.has(lockId)) {
      throw new LockAcquisitionError(`Lock "${lockId}" not acquired`);
    }
    this.held.add(lockId);
    try {
      return await callback();
    } finally {
      this.held.delete(lockId);
    }
  }
}

describe('withConcurrencyGroupLock', () => {
  it('uses one lock id per space and concurrency group', () => {
    expect(concurrencyGroupLockId('default', 'cip-race')).toBe(
      concurrencyGroupLockId('default', 'cip-race')
    );
    expect(concurrencyGroupLockId('default', 'cip-race')).not.toBe(
      concurrencyGroupLockId('other', 'cip-race')
    );
    expect(concurrencyGroupLockId('default', 'cip-race')).not.toBe(
      concurrencyGroupLockId('default', 'queue-race')
    );
  });

  it('runs the callback without a lock when the group has no key', async () => {
    const lock = new FakeGroupLock();
    const withLock = jest.spyOn(lock, 'withLock');

    await expect(withConcurrencyGroupLock(lock, 'default', null, async () => 'open')).resolves.toBe(
      'open'
    );
    expect(withLock).not.toHaveBeenCalled();
  });

  it('serializes callbacks that share a concurrency group and lets other groups proceed', async () => {
    const lock = new FakeGroupLock();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstHeld = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withConcurrencyGroupLock(lock, 'default', 'group-a', async () => {
      order.push('first-enter');
      await firstHeld;
      order.push('first-leave');
    });
    const second = withConcurrencyGroupLock(lock, 'default', 'group-a', async () => {
      order.push('second-enter');
    });
    const otherGroup = withConcurrencyGroupLock(lock, 'default', 'group-b', async () => {
      order.push('other-enter');
    });

    await otherGroup;
    expect(order).toEqual(['first-enter', 'other-enter']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first-enter', 'other-enter', 'first-leave', 'second-enter']);
  });

  it('reenters a group lock already held by this async context', async () => {
    const lock = new FakeGroupLock();
    const withLock = jest.spyOn(lock, 'withLock');

    await withConcurrencyGroupLock(lock, 'default', 'group-a', async () => {
      await withConcurrencyGroupLock(lock, 'default', 'group-a', async () => undefined);
    });

    expect(withLock).toHaveBeenCalledTimes(1);
  });

  describe('when acquisition fails', () => {
    const failingLock = (failures: number): ConcurrencyGroupLock => {
      let attempts = 0;
      return {
        async withLock(_lockId, callback) {
          attempts += 1;
          if (attempts <= failures) {
            throw new LockAcquisitionError('held');
          }
          return callback();
        },
      };
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it('runs the callback when a later attempt acquires the lock', async () => {
      jest.useFakeTimers();
      const lock = failingLock(1);

      const pending = withConcurrencyGroupLock(lock, 'default', 'group-a', async () => 'admitted');
      await jest.advanceTimersByTimeAsync(25);

      await expect(pending).resolves.toBe('admitted');
    });

    it('stops waiting at the end of the lock wait budget', async () => {
      jest.useFakeTimers();
      const lock = failingLock(Number.POSITIVE_INFINITY);

      const pending = withConcurrencyGroupLock(lock, 'default', 'group-a', async () => 'admitted');
      const assertion = expect(pending).rejects.toBeInstanceOf(LockAcquisitionError);
      await jest.advanceTimersByTimeAsync(91_000);

      await assertion;
    });

    it('does not retry an error that is not a lock acquisition failure', async () => {
      let attempts = 0;
      const lock: ConcurrencyGroupLock = {
        async withLock() {
          attempts += 1;
          throw new Error('elasticsearch unavailable');
        },
      };

      await expect(
        withConcurrencyGroupLock(lock, 'default', 'group-a', async () => 'admitted')
      ).rejects.toThrow('elasticsearch unavailable');
      expect(attempts).toBe(1);
    });
  });
});
