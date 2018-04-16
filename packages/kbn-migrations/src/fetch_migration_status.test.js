const _ = require('lodash');
const { fetchMigrationStatus } = require('./fetch_migration_status');
const { MigrationState, MigrationStatus } = require('./lib');
const { mockCluster } = require('./test');

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
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: migrationState,
          },
        },
      }
    });
    const actual = await fetchMigrationStatus({ callCluster, index, plugins });
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
    const actual = await fetchMigrationStatus({ callCluster, plugins, index: '.amazemazing' });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const callCluster = mockCluster({});
    const actual = await fetchMigrationStatus({ callCluster, plugins, index: '.amazemazing' });
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
    const actual = await fetchMigrationStatus({ callCluster, index, plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('index is required', () => {
    expect(testMigrationOpts({ index: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('callCluster is required', () => {
    expect(testMigrationOpts({ callCluster: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('plugins are required', () => {
    expect(testMigrationOpts({ plugins: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('callCluster must be an object', () => {
    expect(testMigrationOpts({ callCluster: 'hello' }))
      .rejects.toThrow(/Got string/);
  });

  test('index must be a string', () => {
    expect(testMigrationOpts({ index: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('plugins must be an array', () => {
    expect(testMigrationOpts({ plugins: 'notright' }))
      .rejects.toThrow(/Got string/);
  });
});

function testMigrationOpts(opts) {
  return fetchMigrationStatus({
    callCluster: _.noop,
    index: 'kibana',
    plugins: [],
    ...opts,
  });
}
