import { buildMigrationPlan } from './migration_plan';
import { buildMigrationState, migrationMapping } from './migration_state';

describe('buildMigrationPlan', () => {
  test('produces strict mappings', () => {
    expect(buildMigrationPlan([], {}).mappings.doc.dynamic).toEqual('strict');
  });

  test('combines mappings from plugins', () => {
    const plugins = [{
      id: 'hello',
      migrations: [],
      mappings: { stuff: 'goes here' },
    }, {
      id: 'farethewell',
      migrations: [],
      mappings: {
        a: { type: 'text' },
        b: { type: 'integer' },
      },
    }];
    expect(buildMigrationPlan(plugins, {}).mappings)
      .toEqual({
        doc: {
          dynamic: 'strict',
          properties: {
            ...migrationMapping,
            stuff: 'goes here',
            a: { type: 'text' },
            b: { type: 'integer' },
          },
        },
      });
  });

  test('retains mappings from disabled plugins', () => {
    const plugins = [{
      id: 'hello',
      migrations: [],
      mappings: { stuff: 'goes here' },
    }, {
      id: 'cartoons',
      migrations: [],
      mappings: {
        bugs: { type: 'bunny' },
        simba: { type: 'tiger' },
      },
    }];
    const state = buildMigrationState(plugins);

    expect(buildMigrationPlan([plugins[0]], state).mappings)
      .toEqual({
        doc: {
          dynamic: 'strict',
          properties: {
            ...migrationMapping,
            stuff: 'goes here',
            bugs: { type: 'bunny' },
            simba: { type: 'tiger' },
          },
        },
      });
  });

  test('disallows duplicate mappings', () => {
    const plugins = [{
      id: 'hello',
      migrations: [],
      mappings: { stuff: 'goes here' },
    }, {
      id: 'cartoons',
      migrations: [],
      mappings: {
        bugs: { type: 'bunny' },
        stuff: { type: 'shazm' },
      },
    }];
    const state = buildMigrationState(plugins);

    expect(() => buildMigrationPlan([plugins[0]], state))
      .toThrow(/Mapping \"stuff\" is defined more than once/);
  });

  test('is empty if no migrations are defined', () => {
    expect(buildMigrationPlan([], {}).migrations).toEqual([]);
  });

  test('handles new migrations', async () => {
    const plugins = [{
      id: 'bon',
      migrations: [{ id: 'derp' }],
    }];
    expect(buildMigrationPlan(plugins, {}).migrations)
      .toEqual([{ pluginId: 'bon', id: 'derp' }]);
  });

  test('is empty if migrations are unchanged', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }];
    const state = buildMigrationState(plugins);
    expect(buildMigrationPlan(plugins, state).migrations)
      .toEqual([]);
  });

  test('lists only new migrations', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }];
    const state = buildMigrationState(plugins);
    plugins[0].migrations.push({ id: 'fancipants' });
    expect(buildMigrationPlan(plugins, state).migrations)
      .toEqual([{ pluginId: 'bon', id: 'fancipants' }]);
  });

  test('disabled plugins have no affect on the dry run', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo' }],
    }, {
      id: 'wart',
      mappings: {
        wart: { type: 'king' },
      },
      migrations: [{ id: 'arthur' }],
    }];
    const state = buildMigrationState(plugins);
    expect(buildMigrationPlan([plugins[1]], state).migrations)
      .toEqual([]);
  });
});
