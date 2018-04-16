const { fetchMigrationStatus } = require('./fetch_migration_status');
const { MigrationState, MigrationStatus } = require('./lib');
const { mockCluster } = require('./test');

describe('fetchMigrationStatus', () => {
  const log = () => {};
  const elasticVersion = '2.3.5';

  test('is migrated, if the stored migration state matches the plugin state', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff' }],
      mappings: {
        shwank: { type: 'text' },
      },
    }];
    const index = '.amazemazing';
    const migrationState = MigrationState.build(plugins);
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      }
    });
    const actual = await fetchMigrationStatus({ callCluster, index, plugins, elasticVersion, log });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is not migrated, if there is no stored migration state', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff' }],
      mappings: {
        shwank: { type: 'text' },
      },
    }];
    const callCluster = mockCluster({});
    const actual = await fetchMigrationStatus({ callCluster, elasticVersion, log, plugins, index: '.amazemazing' });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const callCluster = mockCluster({});
    const actual = await fetchMigrationStatus({ callCluster, elasticVersion, log, plugins, index: '.amazemazing' });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is outOfDate if mappings change', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff' }],
      mappings: {
        shwank: { type: 'text' },
      },
    }];
    const index = '.kibana';
    const migrationState = MigrationState.build(plugins);
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      },
    });
    plugins[0].mappings.shwank.type = 'integer';
    const actual = await fetchMigrationStatus({ callCluster, index, plugins, elasticVersion, log });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });
});
