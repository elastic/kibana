const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');

describe('MigrationPlan.build', () => {
  test('produces strict mappings', () => {
    expect(MigrationPlan.build([], {}).mappings.doc.dynamic).toEqual('strict');
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
    expect(MigrationPlan.build(plugins, {}).mappings)
      .toEqual({
        doc: {
          dynamic: 'strict',
          properties: {
            ...MigrationState.mappings,
            stuff: 'goes here',
            a: { type: 'text' },
            b: { type: 'integer' },
          },
        },
      });
  });

  test('retains mappings from previous index', () => {
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
    const state = MigrationState.build(plugins);
    const currentMappings = {
      someIndexName: {
        mappings: {
          doc: {
            properties: plugins[1].mappings,
          },
        },
      },
    };

    expect(MigrationPlan.build([plugins[0]], state, currentMappings).mappings)
      .toEqual({
        doc: {
          dynamic: 'strict',
          properties: {
            ...MigrationState.mappings,
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
    const state = MigrationState.build(plugins);

    expect(() => MigrationPlan.build(plugins, state))
      .toThrow(/Plugin \"(hello|cartoons)\" is attempting to redefine mapping \"stuff\"/);
  });

  test('disallows mappings with leading underscore', () => {
    const plugins = [{
      id: 'nadachance',
      migrations: [],
      mappings: { _hm: 'You shall not pass!' },
    }];

    expect(() => MigrationPlan.build(plugins, {}))
      .toThrow(/Invalid mapping \"_hm\" in plugin \"nadachance\"\. Mappings cannot start with _/);
  });

  test('handles the empty condition', () => {
    expect(MigrationPlan.build([], {}).migrations).toEqual([]);
  });

  test('handles new migrations', async () => {
    const plugins = [{
      id: 'bon',
      migrations: [{ id: 'derp', type: 'foo' }],
    }];
    expect(MigrationPlan.build(plugins, {}).migrations)
      .toEqual([{ type: 'foo', id: 'derp' }]);
  });

  test('is empty if migrations are unchanged', async () => {
    const plugins = [{
      id: 'bon',
      mappings: {
        merlin: { type: 'wizard' },
      },
      migrations: [{ id: 'bingo', type: 'merlin' }],
    }];
    const state = MigrationState.build(plugins);
    expect(MigrationPlan.build(plugins, state).migrations)
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
    const state = MigrationState.build(plugins);
    plugins[0].migrations.push({ id: 'fancipants' });
    expect(MigrationPlan.build(plugins, state).migrations)
      .toEqual([{ id: 'fancipants' }]);
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
    const state = MigrationState.build(plugins);
    expect(MigrationPlan.build([plugins[1]], state).migrations)
      .toEqual([]);
  });
});
