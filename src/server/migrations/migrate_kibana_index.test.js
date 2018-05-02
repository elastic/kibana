const _ = require('lodash');
const { migrateKibanaIndex } = require('./migrate_kibana_index');
const { mockCluster } = require('../../../packages/kbn-migrations/src/test');

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
      .rejects.toThrow('Failed to start because the Kibana index is migrating');
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
    const { _source: { migration: { status } } } = await callCluster('get', { id: 'migration:migration-state', type: 'doc', index });
    expect(status).toEqual('migrated');
  });
});
