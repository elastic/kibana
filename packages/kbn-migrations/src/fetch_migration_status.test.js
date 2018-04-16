const { fetchMigrationStatus } = require('./fetch_migration_status');
const { MigrationState, MigrationStatus } = require('./lib');
const { mockKbnServer } = require('./test');

describe('fetchMigrationStatus', () => {
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
    const { kbnServer } = mockKbnServer({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      }
    });
    const actual = await fetchMigrationStatus({ kbnServer, index, plugins });
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
    const { kbnServer } = mockKbnServer({});
    const actual = await fetchMigrationStatus({ kbnServer, index: '.amazemazing', plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const { kbnServer } = mockKbnServer({});
    const actual = await fetchMigrationStatus({ kbnServer, index: '.amazemazing', plugins });
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
    const { kbnServer } = mockKbnServer({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      },
    });
    plugins[0].mappings.shwank.type = 'integer';
    const actual = await fetchMigrationStatus({ kbnServer, index, plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });
});
