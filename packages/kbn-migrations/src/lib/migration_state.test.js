const MigrationStatus = require('./migration_status');
const MigrationState = require('./migration_state');
const _ = require('lodash');

describe('MigrationState.status', () => {
  test('is migrating if the migrationState has a status of migrating', () => {
    expect(MigrationState.status([], { status: MigrationStatus.migrating }))
      .toEqual(MigrationStatus.migrating);
  });

  test('is migrated if current plugin checksums match the persisted checksums', () => {
    const plugins = [{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }];
    const state = buildMinimalMigrationState(plugins);

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.migrated);
  });

  test('is out of date if a new plugin is added', () => {
    const plugins = [{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }, {
      id: 'shazm',
      migrations: [],
      mappings: { hey: 'there' },
    }];
    const state = buildMinimalMigrationState([plugins[0]]);

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is out of date if a mapping changes', () => {
    const plugins = [{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }];
    const state = buildMinimalMigrationState(plugins);
    plugins[0].mappings = { stuff: 'SHAZM' };

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is out of date if a migration is added', () => {
    const plugins = [{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }];
    const state = buildMinimalMigrationState(plugins);
    plugins[0].migrations.push({ id: 'dang diggity' });

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is not out of date if a migration is disabled', () => {
    const plugins = [{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }, {
      id: 'shazm',
      migrations: [],
      mappings: { hey: 'there' },
    }];
    const state = buildMinimalMigrationState(plugins);

    expect(MigrationState.status([plugins[0]], state))
      .toEqual(MigrationStatus.migrated);
  });

  function buildMinimalMigrationState(plugins) {
    const state = MigrationState.build(plugins);
    return {
      plugins: state.plugins.map(plugin => _.pick(plugin, ['id', 'migrationsChecksum', 'mappingsChecksum']))
    };
  }
});

describe('MigrationState.build', () => {
  test('tracks id, mappings, checksums, and applied migration ids', () => {
    const plugins = [{
      id: 'z',
      mappings: { foo: 'baz' },
      migrations: [{ id: 'gee' }],
    }, {
      id: 'q',
      mappings: { and: 'there', stuff: 'here' },
      migrations: [{ id: 'm1' }, { id: 'm2' }],
    }];
    expect(MigrationState.build(plugins))
      .toEqual({
        status: 'migrated',
        plugins: [{
          id: 'z',
          mappings: JSON.stringify({ foo: 'baz' }),
          mappingsChecksum: '7697f9a12638d9876c05ba4d9315586d045b5fea',
          migrationIds: ['gee'],
          migrationsChecksum: 'cdcf85917c3d1c2c28c44beb310a5df63ccb3ab4',
        }, {
          id: 'q',
          mappings: JSON.stringify({ and: 'there', stuff: 'here' }),
          mappingsChecksum: '5bf92875bb615a7adfc7f1e0bc5e6b2e62c81db6',
          migrationIds: ['m1', 'm2'],
          migrationsChecksum: 'c8a2decb41373254b0f4bda31ef3587d9ab1a993',
        }],
      });
  });
});
