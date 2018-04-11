import { fetchMigrationStatus } from './fetch_migration_status';
import { buildMigrationState, MigrationStatus } from './migration_helpers';
import { mockServer } from './test';

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
    const migrationState = buildMigrationState(plugins);
    const { server } = mockServer({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      }
    });
    const actual = await fetchMigrationStatus({ server, index, plugins });
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
    const { server } = mockServer({});
    const actual = await fetchMigrationStatus({ server, index: '.amazemazing', plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const { server } = mockServer({});
    const actual = await fetchMigrationStatus({ server, index: '.amazemazing', plugins });
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
    const migrationState = buildMigrationState(plugins);
    const { server } = mockServer({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      },
    });
    plugins[0].mappings.shwank.type = 'integer';
    const actual = await fetchMigrationStatus({ server, index, plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });
});
