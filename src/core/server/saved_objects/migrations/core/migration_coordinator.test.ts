/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coordinateMigration } from './migration_coordinator';
import { createSavedObjectsMigrationLoggerMock } from '../mocks';

describe('coordinateMigration', () => {
  const log = createSavedObjectsMigrationLoggerMock();

  test('waits for isMigrated, if there is an index conflict', async () => {
    const pollInterval = 1;
    const runMigration = jest.fn(() => {
      // eslint-disable-next-line no-throw-literal
      throw { body: { error: { index: '.foo', type: 'resource_already_exists_exception' } } };
    });
    const isMigrated = jest.fn();
    const setStatus = jest.fn();

    isMigrated.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
      setStatus,
    });

    expect(runMigration).toHaveBeenCalledTimes(1);
    expect(isMigrated).toHaveBeenCalledTimes(2);
    const warnings = log.warning.mock.calls.filter((msg: any) => /deleting index \.foo/.test(msg));
    expect(warnings.length).toEqual(1);
  });

  test('does not poll if the runMigration succeeds', async () => {
    const pollInterval = 1;
    const runMigration = jest.fn<any, any>(() => Promise.resolve());
    const isMigrated = jest.fn(() => Promise.resolve(true));
    const setStatus = jest.fn();

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
      setStatus,
    });
    expect(isMigrated).not.toHaveBeenCalled();
  });

  test('does not swallow exceptions', async () => {
    const pollInterval = 1;
    const runMigration = jest.fn(() => {
      throw new Error('Doh');
    });
    const isMigrated = jest.fn(() => Promise.resolve(true));
    const setStatus = jest.fn();

    await expect(
      coordinateMigration({
        log,
        runMigration,
        pollInterval,
        isMigrated,
        setStatus,
      })
    ).rejects.toThrow(/Doh/);
    expect(isMigrated).not.toHaveBeenCalled();
  });
});
