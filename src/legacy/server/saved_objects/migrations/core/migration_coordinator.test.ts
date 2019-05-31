/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { coordinateMigration } from './migration_coordinator';

describe('coordinateMigration', () => {
  const log = {
    debug: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  };

  test('waits for isMigrated, if there is an index conflict', async () => {
    const pollInterval = 1;
    const runMigration = jest.fn(() => {
      // eslint-disable-next-line no-throw-literal
      throw { body: { error: { index: '.foo', type: 'resource_already_exists_exception' } } };
    });
    const isMigrated = jest.fn();

    isMigrated.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
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

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
    });
    expect(isMigrated).not.toHaveBeenCalled();
  });

  test('does not swallow exceptions', async () => {
    const pollInterval = 1;
    const runMigration = jest.fn(() => {
      throw new Error('Doh');
    });
    const isMigrated = jest.fn(() => Promise.resolve(true));

    await expect(
      coordinateMigration({
        log,
        runMigration,
        pollInterval,
        isMigrated,
      })
    ).rejects.toThrow(/Doh/);
    expect(isMigrated).not.toHaveBeenCalled();
  });
});
