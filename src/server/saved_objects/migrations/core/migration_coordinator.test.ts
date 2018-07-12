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
import { MigrationCoordinator } from './migration_coordinator';

describe('MigrationCoordinator', () => {
  test('warns if the lock index exists', async () => {
    const index = '.foo';
    const callCluster = sinon.stub();
    const log = logStub();
    const pollInterval = 1;
    const run = sinon.stub().returns(Promise.resolve());

    callCluster
      .withArgs('indices.create', sinon.match.any)
      .onCall(0)
      .throws({
        body: { error: { type: 'resource_already_exists_exception' } },
      })
      .onCall(1)
      .throws({
        body: { error: { type: 'resource_already_exists_exception' } },
      })
      .onCall(2)
      .returns(Promise.resolve());

    const coordinator = new MigrationCoordinator({
      callCluster,
      index,
      log,
      pollInterval,
    });

    await coordinator.run(run);

    sinon.assert.calledOnce(run);
    expect(
      log.warning.args.filter((msg: any) =>
        /you can delete the lock index "\.foo_migration_lock"/.test(msg)
      ).length
    ).toEqual(1);
  });

  test('deletes the lock after run completes', async () => {
    const index = '.foo';
    const callCluster = sinon.stub();
    const log = logStub();
    const pollInterval = 1;
    const deleteAction = 'indices.delete';
    const run = sinon.spy(() => {
      return Promise.resolve().then(() =>
        sinon.assert.neverCalledWith(callCluster, deleteAction, sinon.match.any)
      );
    });

    callCluster
      .withArgs('indices.exists', sinon.match.any)
      .returns(Promise.resolve(false));

    callCluster
      .withArgs('indices.create', sinon.match.any)
      .onCall(0)
      .returns(Promise.resolve());

    const coordinator = new MigrationCoordinator({
      callCluster,
      index,
      log,
      pollInterval,
    });

    await coordinator.run(run);

    sinon.assert.calledOnce(run);
    sinon.assert.calledWith(callCluster, deleteAction, {
      index: '.foo_migration_lock',
    });
  });

  test('does not swallow exceptions', async () => {
    const index = '.foo';
    const callCluster = sinon.stub();
    const log = logStub();
    const pollInterval = 1;
    const run = sinon.spy();

    callCluster
      .withArgs('indices.exists', sinon.match.any)
      .returns(Promise.resolve(false));

    callCluster
      .withArgs('indices.create', sinon.match.any)
      .throws(new Error('Whoopsie!'));

    const coordinator = new MigrationCoordinator({
      callCluster,
      index,
      log,
      pollInterval,
    });

    expect(coordinator.run(run)).rejects.toThrow(/Whoopsie!/);
    sinon.assert.notCalled(run);
  });
});

function logStub(): any {
  return sinon.stub({
    debug: _.noop,
    warning: _.noop,
  });
}
