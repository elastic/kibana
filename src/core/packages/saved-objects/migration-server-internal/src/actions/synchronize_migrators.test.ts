/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synchronizeMigrators } from './synchronize_migrators';
import { type WaitGroup, waitGroup as createWaitGroup } from '../kibana_migrator_utils';

describe('synchronizeMigrators', () => {
  let waitGroups: Array<WaitGroup<void>>;
  let allWaitGroupsPromise: Promise<any>;
  let migratorsWaitGroups: Array<WaitGroup<void>>;

  beforeEach(() => {
    jest.clearAllMocks();

    waitGroups = ['.kibana_cases', '.kibana_task_manager', '.kibana'].map(createWaitGroup);
    allWaitGroupsPromise = Promise.all(waitGroups.map(({ promise }) => promise));

    migratorsWaitGroups = waitGroups.map(({ resolve, reject }) => ({
      resolve: jest.fn(resolve),
      reject: jest.fn(reject),
      promise: allWaitGroupsPromise,
    }));
  });

  describe('when all migrators reach the synchronization point with a correct state', () => {
    it('unblocks all migrators and resolves Right', async () => {
      const tasks = migratorsWaitGroups.map((waitGroup) => synchronizeMigrators({ waitGroup }));

      const res = await Promise.all(tasks.map((task) => task()));

      migratorsWaitGroups.forEach((waitGroup) =>
        expect(waitGroup.resolve).toHaveBeenCalledTimes(1)
      );
      migratorsWaitGroups.forEach((waitGroup) => expect(waitGroup.reject).not.toHaveBeenCalled());

      expect(res).toEqual([
        {
          _tag: 'Right',
          right: {
            data: [undefined, undefined, undefined],
            type: 'synchronization_successful',
          },
        },
        {
          _tag: 'Right',
          right: {
            data: [undefined, undefined, undefined],
            type: 'synchronization_successful',
          },
        },
        {
          _tag: 'Right',
          right: {
            data: [undefined, undefined, undefined],
            type: 'synchronization_successful',
          },
        },
      ]);
    });

    it('migrators are not unblocked until the last one reaches the synchronization point', async () => {
      let resolved: number = 0;
      migratorsWaitGroups.forEach((waitGroup) => waitGroup.promise.then(() => ++resolved));
      const [casesDefer, ...otherMigratorsDefers] = migratorsWaitGroups;

      // we simulate that only kibana_task_manager and kibana migrators get to the sync point
      const tasks = otherMigratorsDefers.map((waitGroup) => synchronizeMigrators({ waitGroup }));
      // we don't await for them, or we would be locked forever
      Promise.all(tasks.map((task) => task()));

      const [taskManagerDefer, kibanaDefer] = otherMigratorsDefers;
      expect(taskManagerDefer.resolve).toHaveBeenCalledTimes(1);
      expect(kibanaDefer.resolve).toHaveBeenCalledTimes(1);
      expect(casesDefer.resolve).not.toHaveBeenCalled();
      expect(resolved).toEqual(0);

      // finally, the last migrator gets to the synchronization point
      await synchronizeMigrators({ waitGroup: casesDefer })();
      expect(resolved).toEqual(3);
    });
  });

  describe('when one migrator fails and rejects the synchronization defer', () => {
    describe('before the rest of the migrators reach the synchronization point', () => {
      it('synchronizedMigrators resolves Left for the rest of migrators', async () => {
        let resolved: number = 0;
        let errors: number = 0;
        migratorsWaitGroups.forEach((waitGroup) =>
          waitGroup.promise.then(() => ++resolved).catch(() => ++errors)
        );
        const [casesDefer, ...otherMigratorsDefers] = migratorsWaitGroups;

        // we first make one random migrator fail and not reach the sync point
        casesDefer.reject('Oops. The cases migrator failed unexpectedly.');

        // the other migrators then try to synchronize
        const tasks = otherMigratorsDefers.map((waitGroup) => synchronizeMigrators({ waitGroup }));

        expect(Promise.all(tasks.map((task) => task()))).resolves.toEqual([
          {
            _tag: 'Left',
            left: {
              type: 'synchronization_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
          {
            _tag: 'Left',
            left: {
              type: 'synchronization_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
        ]);

        // force next tick (as we did not await for Promises)
        await new Promise((resolve) => setImmediate(resolve));
        expect(resolved).toEqual(0);
        expect(errors).toEqual(3);
      });
    });

    describe('after the rest of the migrators reach the synchronization point', () => {
      it('synchronizedMigrators resolves Left for the rest of migrators', async () => {
        let resolved: number = 0;
        let errors: number = 0;
        migratorsWaitGroups.forEach((waitGroup) =>
          waitGroup.promise.then(() => ++resolved).catch(() => ++errors)
        );
        const [casesDefer, ...otherMigratorsDefers] = migratorsWaitGroups;

        // some migrators try to synchronize
        const tasks = otherMigratorsDefers.map((waitGroup) => synchronizeMigrators({ waitGroup }));

        // we then make one random migrator fail and not reach the sync point
        casesDefer.reject('Oops. The cases migrator failed unexpectedly.');

        expect(Promise.all(tasks.map((task) => task()))).resolves.toEqual([
          {
            _tag: 'Left',
            left: {
              type: 'synchronization_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
          {
            _tag: 'Left',
            left: {
              type: 'synchronization_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
        ]);

        // force next tick (as we did not await for Promises)
        await new Promise((resolve) => setImmediate(resolve));
        expect(resolved).toEqual(0);
        expect(errors).toEqual(3);
      });
    });
  });
});
