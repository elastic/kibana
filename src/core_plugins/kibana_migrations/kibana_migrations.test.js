const _ = require('lodash');
const sinon = require('sinon');
const migrationsPlugin = require('./index');
const { mockCluster } = require('../../../packages/kbn-migrations/src/test');

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
          seed: () => ({ id: 'a', type: 'field1', attributes: 'Dangit' }),
        }],
      }, {
        id: 'p2',
        mappings: {
          field2: { type: 'text' },
        },
        migrations: [{
          id: 'mg2',
          seed: () => ({ id: 'b', type: 'field2', attributes: 'Bobby' }),
        }],
      }];
      const adminCluster = mockCluster({}, {});
      await testMigrationPlugin({ adminCluster, pluginSpecs });

      expect(adminCluster.state()).toMatchSnapshot();
    });

    test('waits for the index to migrate', async () => {
      let timedOut = false;
      const data = {
        '.kibana': {
          'migration:migration-state': {
            _source: {
              migration: {
                status: 'migrating',
                plugins: [],
              },
            },
          },
        },
      };
      const adminCluster = mockCluster(data, {});
      const kbnServer = mockKbnServer({ adminCluster });
      const plugin = migrationsPlugin(mockKibana(kbnServer));
      const promise = plugin.init(kbnServer.server);

      setTimeout(() => {
        expect(plugin.status.value).toEqual('yellow');
        _.set(data, ['.kibana', 'migration:migration-state', '_source', 'migration', 'status'], 'migrated');
        timedOut = true;
      }, 20);

      await promise;
      expect(timedOut).toBeTruthy();
      expect(plugin.status.value).toEqual('green');
    });

    test('respects the force option', async () => {
      const data = {
        '.kibana': {
          'migration:migration-state': {
            _source: {
              migration: {
                status: 'migrating',
                plugins: [],
              },
            },
          },
        },
      };
      const adminCluster = mockCluster(data, {});
      const { plugin } = await testMigrationPlugin({ adminCluster, force: true });

      expect(plugin.status.value).toEqual('green');
      expect(adminCluster.state()).toMatchSnapshot();
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
      const adminCluster = () => {};
      const { kbnServer } = await testMigrationPlugin({ adminCluster });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.callCluster).toEqual(adminCluster);
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
          seed: () => ({ type: 'bar', attributes: 'Dangit' }),
        }],
      }, {
        id: 'sans-stuff',
        mappings: undefined,
        migrations: undefined,
      }];
      const adminCluster = mockCluster({}, {});
      const { kbnServer } = await testMigrationPlugin({ pluginSpecs, adminCluster });
      const opts = kbnServer.server.exposed.migrationOptions();
      expect(opts.plugins).toEqual(pluginSpecs);
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

function mockServer({ adminCluster, index } = {}) {
  const clusterMap = {
    admin: {
      callWithInternalUser: adminCluster || sinon.spy()
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
