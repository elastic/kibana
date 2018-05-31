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
const MigrationContext = require('./migration_context');
const { testCluster } = require('../test');

describe('migrationContext', () => {
  test('generates predictable index names', async () => {
    const actual = await testMigrationContext({ index: 'dang' }, '2.0.4');
    expect(actual.destIndex)
      .toEqual('dang-2.0.4-989db244');
    expect(actual.initialIndex)
      .toEqual('dang-2.0.4-original');
  });

  test('creates a logger that logs info', async () => {
    const logs = [];
    const opts = await buildOpts({});
    opts.log = (...args) => logs.push(args);
    const actual = await MigrationContext.fetch(opts);
    actual.log.info('Wat up?');
    actual.log.info('Logging, sucka!');
    expect(logs)
      .toEqual([
        [['info', 'migration'], 'Wat up?'],
        [['info', 'migration'], 'Logging, sucka!'],
      ]);
  });

  test('creates a logger that logs debug', async () => {
    const logs = [];
    const opts = await buildOpts({});
    opts.log = (...args) => logs.push(args);
    const actual = await MigrationContext.fetch(opts);
    actual.log.debug('I need coffee');
    actual.log.debug('Lots o coffee');
    expect(logs)
      .toEqual([
        [['debug', 'migration'], 'I need coffee'],
        [['debug', 'migration'], 'Lots o coffee'],
      ]);
  });

  test('errors if migrations are defined more than once', () => {
    const plugins = [{
      id: 'x-pack',
      migrations: [{ id: 'foo' }, { id: 'bar' }, { id: 'foo' }],
    }];
    expect(testMigrationContext({ plugins }))
      .rejects.toThrowError(/has migration "foo" defined more than once/);
  });

  test('lower-cases index name', async () => {
    const { initialIndex, destIndex } = await testMigrationContext({}, '1.2.3-BIG');
    expect(initialIndex).toEqual('.sample-index-1.2.3-big-original');
    expect(destIndex).toEqual('.sample-index-1.2.3-big-989db244');
  });

  async function buildOpts(opts, elasticVersion = '9.8.7') {
    const existingDocs = !opts.migrationState ? undefined : [{
      id: 'migration-state',
      type: 'migration',
      attributes: opts.migrationState,
    }];
    const { index, callCluster } = await testCluster({ existingDocs });
    return {
      index,
      elasticVersion,
      log: () => {},
      callCluster,
      plugins: opts.plugins || [],
      ...opts,
    };
  }

  async function testMigrationContext(testOpts, version) {
    const opts = await buildOpts(testOpts, version);
    return MigrationContext.fetch(opts);
  }
});
