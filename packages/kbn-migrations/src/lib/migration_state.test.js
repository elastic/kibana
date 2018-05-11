const MigrationStatus = require('./migration_status');
const MigrationState = require('./migration_state');
const Plugin = require('./plugin');
const _ = require('lodash');

describe('MigrationState.status', () => {
  test('is migrating if the migrationState has a status of migrating', () => {
    expect(MigrationState.status([], { status: MigrationStatus.migrating }))
      .toEqual(MigrationStatus.migrating);
  });

  test('is migrated if current plugin checksums match the persisted checksums', () => {
    const plugins = Plugin.sanitize([{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }]);
    const state = buildMinimalMigrationState(plugins);

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.migrated);
  });

  test('is out of date if a new plugin is added', () => {
    const plugins = Plugin.sanitize([{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }, {
      id: 'shazm',
      migrations: [],
      mappings: { hey: 'there' },
    }]);
    const state = buildMinimalMigrationState([plugins[0]]);

    expect(MigrationState.status(plugins, state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is out of date if a mapping changes', () => {
    const plugins = Plugin.sanitize([{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }]);
    const state = buildMinimalMigrationState(plugins);

    plugins[0].mappings = { stuff: 'SHAZM' };

    expect(MigrationState.status(Plugin.sanitize(plugins), state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is out of date if a migration is added', () => {
    const plugins = Plugin.sanitize([{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }]);
    const state = buildMinimalMigrationState(plugins);
    plugins[0].migrations.push({ id: 'dang diggity' });

    expect(MigrationState.status(Plugin.sanitize(plugins), state))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is not out of date if a migration is disabled', () => {
    const plugins = Plugin.sanitize([{
      id: 'hello-world',
      migrations: [{ id: 'migration1' }, { id: 'migration2' }],
      mappings: { stuff: 'whatnot' },
    }, {
      id: 'shazm',
      migrations: [],
      mappings: { hey: 'there' },
    }]);
    const state = buildMinimalMigrationState(plugins);

    expect(MigrationState.status([plugins[0]], state))
      .toEqual(MigrationStatus.migrated);
  });

  function buildMinimalMigrationState(plugins) {
    const state = MigrationState.build(plugins);
    return {
      plugins: state.plugins.map(plugin => _.pick(plugin, ['id', 'checksum']))
    };
  }
});

describe('MigrationState.build', () => {
  test('tracks id, mappings, checksums, and applied migration ids', () => {
    const plugins = Plugin.sanitize([{
      id: 'z',
      mappings: { foo: 'baz' },
      migrations: [{ id: 'gee' }],
    }, {
      id: 'q',
      mappings: { and: 'there', stuff: 'here' },
      migrations: [{ id: 'm1' }, { id: 'm2' }],
    }]);
    expect(MigrationState.build(plugins))
      .toEqual({
        status: 'migrated',
        plugins: [{
          id: 'z',
          mappings: JSON.stringify({ foo: 'baz' }),
          checksum: '6e656d01cb4c13e4faeb8d75ae603a7426c3690d',
          migrationIds: ['gee'],
        }, {
          id: 'q',
          mappings: JSON.stringify({ and: 'there', stuff: 'here' }),
          checksum: '71a16ddd5ef53fe2515efd14839a00391a151ec9',
          migrationIds: ['m1', 'm2'],
        }],
      });
  });
});
