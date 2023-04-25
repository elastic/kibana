/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { synchronizeMigrators } from './synchronize_migrators';
import { type Defer, defer } from '../kibana_migrator_utils';

describe('synchronizeMigrators', () => {
  let defers: Array<Defer<void>>;
  let allDefersPromise: Promise<any>;
  let migratorsDefers: Array<Defer<void>>;

  beforeEach(() => {
    jest.clearAllMocks();

    defers = ['.kibana_cases', '.kibana_task_manager', '.kibana'].map(defer);
    allDefersPromise = Promise.all(defers.map(({ promise }) => promise));

    migratorsDefers = defers.map(({ resolve, reject }) => ({
      resolve: jest.fn(resolve),
      reject: jest.fn(reject),
      promise: allDefersPromise,
    }));
  });

  describe('when all migrators reach the synchronization point with a correct state', () => {
    it('unblocks all migrators and resolves Right', async () => {
      const tasks = migratorsDefers.map((migratorDefer) => synchronizeMigrators(migratorDefer));

      const res = await Promise.all(tasks.map((task) => task()));

      migratorsDefers.forEach((migratorDefer) =>
        expect(migratorDefer.resolve).toHaveBeenCalledTimes(1)
      );
      migratorsDefers.forEach((migratorDefer) =>
        expect(migratorDefer.reject).not.toHaveBeenCalled()
      );

      expect(res).toEqual([
        { _tag: 'Right', right: 'synchronized_successfully' },
        { _tag: 'Right', right: 'synchronized_successfully' },
        { _tag: 'Right', right: 'synchronized_successfully' },
      ]);
    });

    it('migrators are not unblocked until the last one reaches the synchronization point', async () => {
      let resolved: number = 0;
      migratorsDefers.forEach((migratorDefer) => migratorDefer.promise.then(() => ++resolved));
      const [casesDefer, ...otherMigratorsDefers] = migratorsDefers;

      // we simulate that only kibana_task_manager and kibana migrators get to the sync point
      const tasks = otherMigratorsDefers.map((migratorDefer) =>
        synchronizeMigrators(migratorDefer)
      );
      // we don't await for them, or we would be locked forever
      Promise.all(tasks.map((task) => task()));

      const [taskManagerDefer, kibanaDefer] = otherMigratorsDefers;
      expect(taskManagerDefer.resolve).toHaveBeenCalledTimes(1);
      expect(kibanaDefer.resolve).toHaveBeenCalledTimes(1);
      expect(casesDefer.resolve).not.toHaveBeenCalled();
      expect(resolved).toEqual(0);

      // finally, the last migrator gets to the synchronization point
      await synchronizeMigrators(casesDefer)();
      expect(resolved).toEqual(3);
    });
  });

  describe('when one migrator fails and rejects the synchronization defer', () => {
    describe('before the rest of the migrators reach the synchronization point', () => {
      it('synchronizedMigrators resolves Left for the rest of migrators', async () => {
        let resolved: number = 0;
        let errors: number = 0;
        migratorsDefers.forEach((migratorDefer) =>
          migratorDefer.promise.then(() => ++resolved).catch(() => ++errors)
        );
        const [casesDefer, ...otherMigratorsDefers] = migratorsDefers;

        // we first make one random migrator fail and not reach the sync point
        casesDefer.reject('Oops. The cases migrator failed unexpectedly.');

        // the other migrators then try to synchronize
        const tasks = otherMigratorsDefers.map((migratorDefer) =>
          synchronizeMigrators(migratorDefer)
        );

        expect(Promise.all(tasks.map((task) => task()))).resolves.toEqual([
          {
            _tag: 'Left',
            left: {
              type: 'sync_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
          {
            _tag: 'Left',
            left: {
              type: 'sync_failed',
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
        migratorsDefers.forEach((migratorDefer) =>
          migratorDefer.promise.then(() => ++resolved).catch(() => ++errors)
        );
        const [casesDefer, ...otherMigratorsDefers] = migratorsDefers;

        // some migrators try to synchronize
        const tasks = otherMigratorsDefers.map((migratorDefer) =>
          synchronizeMigrators(migratorDefer)
        );

        // we then make one random migrator fail and not reach the sync point
        casesDefer.reject('Oops. The cases migrator failed unexpectedly.');

        expect(Promise.all(tasks.map((task) => task()))).resolves.toEqual([
          {
            _tag: 'Left',
            left: {
              type: 'sync_failed',
              error: 'Oops. The cases migrator failed unexpectedly.',
            },
          },
          {
            _tag: 'Left',
            left: {
              type: 'sync_failed',
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
