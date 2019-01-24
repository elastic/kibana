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
import sinon from 'sinon';
import { coordinateMigration } from './migration_coordinator';

describe('coordinateMigration', () => {
  test('waits for isMigrated, if there is an index conflict', async () => {
    const log = logStub();
    const pollInterval = 1;
    const runMigration = sinon.spy(() => {
      throw { body: { error: { index: '.foo', type: 'resource_already_exists_exception' } } };
    });
    const isMigrated = sinon.stub();

    isMigrated
      .onFirstCall()
      .returns(Promise.resolve(false))
      .onSecondCall()
      .returns(Promise.resolve(true));

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
    });

    sinon.assert.calledOnce(runMigration);
    sinon.assert.calledTwice(isMigrated);
    const warnings = log.warning.args.filter((msg: any) => /deleting index \.foo/.test(msg));
    expect(warnings.length).toEqual(1);
  });

  test('does not poll if the runMigration succeeds', async () => {
    const log = logStub();
    const pollInterval = 1;
    const runMigration = sinon.spy(() => Promise.resolve());
    const isMigrated = sinon.spy(() => Promise.resolve(true));

    await coordinateMigration({
      log,
      runMigration,
      pollInterval,
      isMigrated,
    });
    sinon.assert.notCalled(isMigrated);
  });

  test('does not swallow exceptions', async () => {
    const log = logStub();
    const pollInterval = 1;
    const runMigration = sinon.spy(() => {
      throw new Error('Doh');
    });
    const isMigrated = sinon.spy(() => Promise.resolve(true));

    await expect(
      coordinateMigration({
        log,
        runMigration,
        pollInterval,
        isMigrated,
      })
    ).rejects.toThrow(/Doh/);
    sinon.assert.notCalled(isMigrated);
  });
});

function logStub(): any {
  return sinon.stub({
    debug: _.noop,
    warning: _.noop,
  });
}
