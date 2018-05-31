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
const _ = require('lodash');
const sinon = require('sinon');
const migrationsPlugin = require('./index');
const { testCluster } = require('../../../packages/kbn-migrations/src/test');

describe('kibana_migrations plugin', () => {
  describe('init', () => {

    test('goes from yellow to green', async () => {
      const { plugin, kbnServer } = await testMigrationPlugin();

      expect(kbnServer.server.plugins.elasticsearch.waitUntilReady.calledOnce)
        .toBeTruthy();
      expect(plugin.status.yellow.args).toEqual([
        ['Waiting for elasticsearch...'],
        ['Migrating the Kibana index...'],
      ]);
      expect(plugin.status.value).toEqual('green');
    });

    test('migrates the kibana index', async () => {
      const pluginSpecs = [{
        id: 'p1',
        mappings: {
          field1: { type: 'text' },
        },
        migrations: [{
          id: 'mg1',
          type: 'field1',
          seed: () => ({ id: 'a', type: 'field1', attributes: 'Dangit' }),
        }],
      }, {
        id: 'p2',
        mappings: {
          field2: { type: 'text' },
        },
        migrations: [{
          id: 'mg2',
          type: 'field2',
          seed: () => ({ id: 'b', type: 'field2', attributes: 'Bobby' }),
        }],
      }];
      const { callCluster } = await testCluster();
      await testMigrationPlugin({ callCluster, pluginSpecs });

      expect(callCluster.state()).toMatchSnapshot();
    });

    test('waits for the index to migrate', async () => {
      let timedOut = false;
      const existingDocs = [{
        id: 'migration-state',
        type: 'migration',
        attributes: {
          status: 'migrating',
          plugins: [],
        },
      }];
      const { callCluster } = await testCluster({ existingDocs, index: '.kibana' });
      const kbnServer = mockKbnServer({ callCluster });
      const plugin = migrationsPlugin(mockKibana(kbnServer));
      const promise = plugin.init(kbnServer.server);

      setTimeout(() => {
        expect(plugin.status.value).toEqual('yellow');
        timedOut = true;
        setStatus(callCluster, 'migrated');
      }, 20);

      await promise;
      expect(timedOut).toBeTruthy();
      expect(plugin.status.value).toEqual('green');
    });

    test('respects the force option', async () => {
      const existingDocs = [{
        id: 'migration-state',
        type: 'migration',
        attributes: {
          status: 'migrating',
          plugins: [],
        },
      }];
      const { callCluster } = await testCluster({ existingDocs, index: '.kibana' });
      const { plugin } = await testMigrationPlugin({ callCluster, force: true });

      expect(plugin.status.value).toEqual('green');
      expect(callCluster.state()).toMatchSnapshot();
    });
  });

  describe('migrationOptions', () => {
    test('exposes whatever callCluster it is passed', async () => {
      const callCluster = () => {};
      const { kbnServer } = await testMigrationPlugin();
      const opts = kbnServer.server.exposed.migrationOptions({ callCluster });
      expect(opts.callCluster).toEqual(callCluster);
    });

    test('exposes callWithInternalUser if no callCluster is specified', async () => {
      const callCluster = () => {};
      const { kbnServer } = await testMigrationPlugin({ callCluster });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.callCluster).toEqual(callCluster);
    });

    test('exposes configured index', async () => {
      const index = Math.random().toString();
      const { kbnServer } = await testMigrationPlugin({ index });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.index).toEqual(index);
    });

    test('exposes elastic version', async () => {
      const version = Math.random().toString();
      const { kbnServer } = await testMigrationPlugin({ version });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.elasticVersion).toEqual(version);
    });

    test('exposes the server log function', async () => {
      const { kbnServer } = await testMigrationPlugin();
      const opts = kbnServer.server.exposed.migrationOptions();
      opts.log(['hello'], 'world');
      expect(_.last(kbnServer.server.log.args)).toEqual([['hello'], 'world']);
    });

    test('exposes pluginSpecs', async () => {
      const pluginSpecs = [{
        id: 'foo',
        mappings: {
          bar: { type: 'text' },
        },
        migrations: [{
          id: 'mg1',
          type: 'bar',
          seed: () => ({ type: 'bar', attributes: 'Dangit' }),
        }],
      }, {
        id: 'sans-stuff',
        mappings: undefined,
        migrations: undefined,
      }];
      const { callCluster } = await testCluster();
      const { kbnServer } = await testMigrationPlugin({ pluginSpecs, callCluster });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.plugins).toMatchSnapshot();
    });
  });
});

async function testMigrationPlugin(config) {
  const kbnServer = mockKbnServer(config);
  const plugin = migrationsPlugin(mockKibana(kbnServer));
  await plugin.init(kbnServer.server);

  return { plugin, kbnServer };
}

function mockKibana(kbnServer) {
  function Plugin({ init }) {
    this.kbnServer = kbnServer || mockKbnServer();
    this.status = {
      yellow: sinon.spy(() => this.status.value = 'yellow'),
      green: sinon.spy(() => this.status.value = 'green'),
    };
    this.init = init;
  }

  return { Plugin };
}

function mockKbnServer(config = {}) {
  return {
    version: config.version || '4.5.6',
    server: mockServer(config),
    settings: {
      migration: {
        force: config.force,
      },
    },
    pluginSpecs: (config.pluginSpecs || []).map((pluginSpec) => ({
      getId: () => pluginSpec.id,
      getExportSpecs: () => _.cloneDeep(pluginSpec),
      getMigrations: () => _.cloneDeep(pluginSpec.migrations),
    })),
  };
}

function mockServer({ callCluster, index } = {}) {
  const clusterMap = {
    admin: {
      callWithInternalUser: callCluster || sinon.spy()
    },
  };
  const configMap = {
    'kibana.index': index || '.kibana',
    'kibanamigrations.pollInterval': 10,
  };
  const server = {
    exposed: {},
    expose: sinon.spy((k, v) => server.exposed[k] = v),
    config() {
      return {
        get(key) {
          return configMap[key];
        }
      };
    },
    log: sinon.spy(),
    plugins: {
      elasticsearch: {
        getCluster(name) {
          return clusterMap[name];
        },
        waitUntilReady: sinon.spy(() => Promise.resolve()),
      },
    },
  };

  return server;
}

function setStatus(callCluster, status) {
  return callCluster('update', {
    id: 'migration:migration-state',
    type: 'doc',
    index: '.kibana',
    body: {
      doc: {
        type: 'migration',
        migration: {
          status,
          plugins: [],
        },
      },
    },
  });
}
