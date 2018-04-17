const _ = require('lodash');
const { fetchMigrationState } = require('./fetch_migration_state');
const { mockCluster } = require('./test');

describe('fetchMigrationState', () => {
  test('it returns a reasonable default migration state if the index has none', async () => {
    const callCluster = mockCluster({}, {});
    const index = '.kibana';
    const result = await fetchMigrationState({ callCluster, index });
    expect(result).toEqual({ plugins: [], status: 'outOfDate' });
  });

  test('returns the saved migration state, if it exists', async () => {
    const index = '.kibana';
    const migrationState = {
      status: 'migrated',
      plugins: [{
        id: 'abc',
        mappings: '{}',
        mappingsChecksum: 'mp1',
        migrationIds: ['m1', 'm2'],
        migrationsChecksum: 'mg1',
      }],
    };
    const callCluster = mockCluster({
      [index]: {
        'migration:migration-state': {
          _source: {
            migration: _.cloneDeep(migrationState),
          },
        },
      }
    });
    const actual = await fetchMigrationState({ callCluster, index });
    expect(actual).toEqual(migrationState);
  });

  test('index is required', () => {
    expect(testMigrationOpts({ index: undefined }))
      .rejects.toThrow(/property index must be of type string/);
  });

  test('callCluser is required', () => {
    expect(testMigrationOpts({ callCluster: undefined }))
      .rejects.toThrow(/property callCluster must be of type function/);
  });
});

function testMigrationOpts(opts) {
  return fetchMigrationState({
    callCluster: _.noop,
    index: 'kibana',
    plugins: [],
    ...opts,
  });
}
