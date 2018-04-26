const _ = require('lodash');
const { migrateKibanaIndex } = require('./migrate_kibana_index');
const { mockCluster } = require('../../../packages/kbn-migrations/src/test');
const Migration = require('@kbn/migrations');

describe('migrateKibanaIndex', () => {
  test('fails if the index is already migrating', async () => {
    const callCluster = mockCluster({
      fooindex: {
        'migration:migration-state': {
          _source: {
            migration: {
              status: 'migrating',
              plugins: [],
            },
          },
        },
      },
    });
    const kbnServer = {
      pluginSpecs: [],
      version: '3',
      server: {
        config: () => ({ get: () => 'fooindex' }),
        log: _.noop,
        plugins: {
          elasticsearch: {
            getCluster() {
              return {
                callWithInternalUser: callCluster,
              };
            },
          },
        },
      },
    };

    expect(migrateKibanaIndex(kbnServer))
      .rejects.toThrow('The Kibana index is migrating');
  });

  test('respects the force option', async () => {
    const index = 'fooindex';
    const callCluster = mockCluster({
      fooindex: {
        'migration:migration-state': {
          _source: {
            migration: {
              status: 'migrating',
              plugins: [],
            },
          },
        },
      },
    });
    const kbnServer = {
      pluginSpecs: [],
      version: '3',
      settings: { migration: { force: true } },
      server: {
        config: () => ({ get: () => index }),
        log: _.noop,
        plugins: {
          elasticsearch: {
            getCluster() {
              return {
                callWithInternalUser: callCluster,
              };
            },
          },
        },
      },
    };

    await migrateKibanaIndex(kbnServer);
    const { status } = await Migration.fetchMigrationState({ callCluster, index });
    expect(status).toEqual('migrated');
  });
});
