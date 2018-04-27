const _ = require('lodash');
const { migrate, fetchStatus } = require('./migration');
const { mockCluster } = require('./test');
const { MigrationState, Plugins, MigrationContext, MigrationStatus } = require('./lib');

describe('Migration.fetchStatus', () => {
  test('is migrated, if the stored migration state matches the plugin state', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff', seed() {} }],
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
    const actual = await fetchStatus({ callCluster, index, plugins });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is not migrated, if there is no stored migration state', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff', seed() {} }],
      mappings: {
        shwank: { type: 'text' },
      },
    }];
    const callCluster = mockCluster({});
    const actual = await fetchStatus({ callCluster, plugins, index: '.amazemazing' });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const callCluster = mockCluster({});
    const actual = await fetchStatus({ callCluster, plugins, index: '.amazemazing' });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is outOfDate if mappings change', async () => {
    const plugins = [{
      id: 'shwank',
      migrations: [{ id: 'do_stuff', seed() {} }],
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
    const actual = await fetchStatus({ callCluster, index, plugins });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('index is required', () => {
    expect(testMigrationOpts({ index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('callCluster is required', () => {
    expect(testMigrationOpts({ callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('plugins are required', () => {
    expect(testMigrationOpts({ plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be an object', () => {
    expect(testMigrationOpts({ callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(testMigrationOpts({ index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(testMigrationOpts({ plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });
});

describe('Migration.migrate', () => {
  const elasticVersion = '9.8.7';
  const log = () => {};

  test('does nothing if there are no migrations defined', async () => {
    const plugins = [];
    const index = '.amazemazing';
    const callCluster = mockCluster({});
    await migrate({ callCluster, index, plugins, elasticVersion, log });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('creates the index and alias if it does not exist', async () => {
    const plugins = [{
      id: 'hoi',
      mappings: {
        stuff: { type: 'integer' },
      },
    }];
    const index = '.mufasa';
    const callCluster = mockCluster({});
    await migrate({ callCluster, log, elasticVersion, index, plugins });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('existing indices are converted to aliases and migrated', async () => {
    const index = '.mufasa';
    const plugins = [{
      id: 'hoi',
      mappings: {
        stuff: { type: 'integer' },
      },
    }];
    const existingData = { [index]: {} };
    const existingMeta = assocMappings({}, index, {
      shut_the_front_door: {
        properties: {
          name: {
            type: 'integer',
          },
        },
      },
    });
    const callCluster = mockCluster(existingData, existingMeta);
    await migrate({ callCluster, index, plugins, log, elasticVersion });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('race-condition for new indices, migration fails if attempted to run in parallel', async () => {
    const plugins = [{
      id: 'hoi',
      migrations: [{ id: 'm1', filter: () => true, transform: _.identity }],
    }];
    const index = '.mufasa';
    const callCluster = mockCluster({});
    const results = await Promise.all([
      migrate({ callCluster, index, plugins, elasticVersion, log })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ callCluster, index, plugins, elasticVersion, log })
        .catch(({ statusCode }) => ({ status: statusCode })),
    ]);
    expect(results[0].status).toEqual('migrated');
    expect(results[1].status).toEqual(400);
  });

  test('if new index migration fails, subsequent migrations will not run', async () => {
    const index = '.anindexname';
    const plugins = [{
      id: 'hoi',
      mappings: {
        stuff: { type: 'integer' },
      },
      migrations: [{
        id: 'a',
        seed: () => { throw new Error('This was a crappy migration.'); },
      }],
    }];
    const callCluster = mockCluster({});
    const opts = { callCluster, log, elasticVersion, index, plugins };
    await expect(migrate(opts))
      .rejects.toThrow();

    plugins[0].migrations[0].seed = () => ({
      id: 'fixed',
      type: 'stuff',
      attributes: 32,
    });

    const { status } = await migrate(opts);
    expect(status)
      .toEqual('migrating');
  });

  test('race-condition version is used for optimistic concurrency', async () => {
    const alias = 'race';
    const index = 'race-v1';
    const pluginV1 = {
      id: 'concurrency',
      migrations: [{ id: 'm1', filter: () => true, transform: _.identity }],
    };
    const originalMigrationState = MigrationState.build([pluginV1]);
    const pluginV2 = {
      ...pluginV1,
      migrations: [...pluginV1.migrations, { id: 'm2', filter: () => true, transform: _.identity }],
    };
    const existingData = assocMigrationState({}, index, originalMigrationState);
    const existingMeta = assocAlias({}, index, alias);
    const callCluster = mockCluster(existingData, existingMeta);
    const results = await Promise.all([
      migrate({ callCluster, index: alias, elasticVersion, log, plugins: [pluginV2] })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ callCluster, index: alias, elasticVersion, log, plugins: [pluginV2] })
        .catch(({ statusCode }) => ({ status: statusCode })),
    ]);

    // Our second attempt should fail with a version conflict. If this test begins to fail,
    // we may need to introduce an artificial delay into callCluster's 'update' call only
    // for this test.
    expect(results[0].status).toEqual('migrated');
    expect(results[1].status).toEqual(409);
  });

  test('new index gets seeded', async () => {
    const plugins = [{
      id: 'hoi',
      mappings: {
        music: { properties: { jazz: { type: 'blob' }, }, },
      },
      migrations: [{
        id: 'jazzhands',
        seed: () => ({
          id: 'jazzmeup',
          type: 'music',
          attributes: {
            jazz: { louis: 'Armstrong' },
          },
        }),
      }],
    }];
    const index = '.mufasa';
    const callCluster = mockCluster({});
    await migrate({ callCluster, index, plugins, elasticVersion, log });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('seeds are transformed', async () => {
    const index = '.music';
    const plugins = [{
      id: 'hoi',
      mappings: {
        artists: { properties: { louis: { type: 'text' }, john: { type: 'text' } } },
      },
      migrations: [{
        id: 'never_happens',
        filter: ({ artists }) => !!artists,
        transform: () => ({ miles: 'davis' }),
      }, {
        id: 'add_jazzmeup',
        seed: () => ({
          id: 'jazzmeup',
          type: 'artists',
          attributes: {
            louis: 'Armstrong',
          },
        }),
      }, {
        id: 'enter_coltrane',
        filter: ({ type }) => type === 'artists',
        transform: (doc) => _.set(_.cloneDeep(doc), ['attributes', 'john'], 'coltrane'),
      }],
    }];
    const callCluster = mockCluster({});
    await migrate({ callCluster, index, plugins, elasticVersion, log });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('existing docs are migrated', async () => {
    const index = 'gentleman';
    const plugins = [{
      id: 'hoi',
      mappings: {
        baz: { properties: { bar: { type: 'keyword' } } },
      },
    }];
    const existingData = _.set({}, [index, 'baz:fred', '_source'], { type: 'baz', baz: { bar: 'bing' } });
    const existingMeta = assocMappings({}, index, plugins[0].mappings);
    const callCluster = mockCluster(existingData, existingMeta);
    await migrate({ callCluster, index, plugins, elasticVersion, log });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('existing docs are transformed', async () => {
    const index = 'groovystuff';
    const plugin1 = {
      id: 'users',
      mappings: {
        user: { properties: { name: { type: 'keyword' }, country: { type: 'keyword' }, }, },
      },
      migrations: [{
        id: 'ensure_country',
        filter: ({ type }) => type === 'user',
        transform: (doc) => _.set(_.cloneDeep(doc), ['attributes', 'country'], 'N/A'),
      }],
    };
    const plugin2 = {
      id: 'preferences',
      mappings: {
        preference: { properties: { resultSize: { type: 'integer' }, color: { type: 'keyword' }, }, },
      },
      migrations: [{
        id: 'default_pref',
        seed: () => ({
          id: 'default_pref',
          type: 'preference',
          attributes: { resultSize: 10, color: 'steelblue' },
        }),
      }],
    };
    const existingData = {
      [index]: {
        'user:u1': { _source: { type: 'user', user: { name: 'jimmy fallon' } } },
        'user:u2': { _source: { type: 'user', user: { name: 'bono' } } },
        'preference:p1': { _source: { type: 'preference', preference: { resultSize: 1, color: 'blue' } } },
      },
    };
    const existingMeta = assocMappings({}, index, {
      ...plugin2.mappings,
      user: { name: { type: 'keyword' } },
    });
    const callCluster = mockCluster(existingData, existingMeta);
    await migrate({ callCluster, index, elasticVersion, log, plugins: [plugin1, plugin2] });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('existing previously migrated index only runs new migrations', async () => {
    const index = 'aquatica';
    const pluginV1 = {
      id: 'fishes',
      mappings: {
        fish: { properties: { kind: { type: 'keyword' }, }, },
      },
      migrations: [{
        id: 'something_or_other',
        filter: () => true,
        transform: (doc) => { throw new Error(JSON.stringify(doc)); },
      }],
    };
    const originalMigrationState = MigrationState.build([pluginV1]);
    const pluginV2 = {
      id: pluginV1.id,
      mappings: {
        fish: { properties: { species: { type: 'keyword' }, }, },
      },
      migrations: [
        ...pluginV1.migrations, {
          id: 'convert_kind_to_species',
          filter: ({ type }) => type === 'fish',
          transform: (doc) => _.set(doc, 'attributes', { species: doc.attributes.kind }),
        },
      ],
    };
    const existingData = assocMigrationState({}, index, originalMigrationState);
    _.set(existingData, [index, 'fish:f1', '_source'], { type: 'fish', fish: { kind: 'catfish' } });
    _.set(existingData, [index, 'fish:f2', '_source'], { type: 'fish', fish: { kind: 'carp' } });
    const existingMeta = assocMappings({}, index, pluginV1.mappings);
    const callCluster = mockCluster(existingData, existingMeta);
    await migrate({ callCluster, index, elasticVersion, log, plugins: [pluginV2] });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('migrations are skipped if migration status is migrating', async () => {
    const index = 'skippy';
    const pluginV1 = {
      id: 'fishes',
      mappings: {
        fish: { properties: { kind: { type: 'keyword' }, }, },
      },
      migrations: [],
    };
    const originalMigrationState = MigrationState.build([pluginV1]);
    const pluginV2 = _.set(_.cloneDeep(pluginV1), 'mappings.fish.properties.freshWater.type', 'boolean');
    const existingData = assocMigrationState({}, index, {
      ...originalMigrationState,
      status: 'migrating',
    });
    const existingMeta = assocMappings({}, index, pluginV1.mappings);
    const callCluster = mockCluster(existingData, existingMeta);
    const result = await migrate({ callCluster, index, elasticVersion, log, plugins: [pluginV2] });
    expect(result.destIndex).toEqual(result.index);
    expect(result.status).toEqual('migrating');
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('migrations will run, if forced even if index is in migrating state', async () => {
    // If migrations failed for some reason, we might have a state where there is
    // an original index in the 'migrating' state, and an existing, partially
    // migrated dest index. This tests that such a scenario can be recovered from via
    // a forced migration.
    const index = 'skippy';
    const plugins = [{
      id: 'fishes',
      mappings: _.set({}, 'fish.properties.kind.type', 'keyword'),
      migrations: [{
        id: 'makeafish',
        seed: () => ({
          id: 'bass',
          type: 'fish',
          attributes: {
            kind: 'freshwater',
          },
        }),
      }],
    }];
    const context = await MigrationContext.fetch({ callCluster: mockCluster({}, {}), index, elasticVersion, log, plugins });
    const destIndex = _.set({}, [context.destIndex, 'fish:bass', '_source', 'fish', 'kind'], 'BLOW THIS AWAY!!!');
    const existingData = assocMigrationState(destIndex, index, {
      status: 'migrating',
      plugins: [],
    });
    const existingMeta = assocMappings({}, index, plugins[0].mappings);
    const callCluster = mockCluster(existingData, existingMeta);
    const result = await migrate({ force: true, callCluster, index, elasticVersion, log, plugins });
    expect(_.pick(result, ['destIndex', 'index', 'status']))
      .toEqual({
        destIndex: 'skippy-9.8.7-e5a3a5d45fee54a1e06c91cd86ab07e8c5f3a9cc',
        index: 'skippy',
        status: 'migrated'
      });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('errors if index has later migrations than the current plugins allow', async () => {
    const index = 'aquatica';
    const pluginV2 = {
      id: 'futureplugin',
      mappings: {
        future: { properties: { desc: { type: 'keyword' }, }, },
      },
      migrations: [{
        id: 'm1',
        filter: () => true,
        transform: _.identity,
      }, {
        id: 'm2',
        filter: () => true,
        transform: _.identity,
      }],
    };
    const migrationState = MigrationState.build([pluginV2]);
    const pluginV1 = {
      ...pluginV2,
      migrations: [pluginV2.migrations[0]],
    };
    const existingData = assocMigrationState({}, index, migrationState);
    const existingMeta = assocMappings({}, index, pluginV1.mappings);
    const callCluster = mockCluster(existingData, existingMeta);
    expect(migrate({ callCluster, index, elasticVersion, log, plugins: [pluginV1] }))
      .rejects.toThrow(/migration order has changed/);
  });

  test('data and mappings for disabled plugins is retained', async () => {
    const index = 'disabled-scenario';
    const existingIndex = 'disabled-scenario-1';
    const pluginsV1 = [{
      id: 'quotes',
      mappings: {
        quote: { properties: { text: { type: 'text' }, }, },
      },
    }, {
      id: 'tweets',
      mappings: {
        tweet: { properties: { chars: { type: 'text' }, }, },
      },
    }];
    const pluginsV2 = [{
      id: 'quotes',
      mappings: {
        quote: { properties: { text: { type: 'text' }, author: { type: 'keyword' }, }, },
      },
    }];
    const originalMigrationState = MigrationState.build(Plugins.sanitize(pluginsV1));
    const existingData = assocMigrationState({}, existingIndex, originalMigrationState);
    _.set(existingData, [existingIndex, 'quote:q1', '_source'], {
      type: 'quote',
      quote: { text: 'It\'s a dangerous business going out your front door.' },
    });
    _.set(existingData, [existingIndex, 'tweet:t1', '_source'], {
      type: 'tweet',
      tweet: { chars: 'The past is not what it was.' },
    });
    const existingMeta = assocAlias({}, existingIndex, index);
    assocMappings(existingMeta, existingIndex, { ...pluginsV1[0].mappings, ...pluginsV1[1].mappings });
    const callCluster = mockCluster(existingData, existingMeta);
    await migrate({ callCluster, index, elasticVersion, log, plugins: pluginsV2 });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('index is required', () => {
    expect(testMigrationOpts({ index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('callCluster is required', () => {
    expect(testMigrationOpts({ callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('log is required', () => {
    expect(testMigrationOpts({ log: undefined }))
      .rejects.toThrow(/"log" is required/);
  });

  test('log must be a function', () => {
    expect(testMigrationOpts({ log: 'hello' }))
      .rejects.toThrow(/"log" must be a Function/);
  });

  test('elasticVersion is required', () => {
    expect(testMigrationOpts({ elasticVersion: undefined }))
      .rejects.toThrow(/"elasticVersion" is required/);
  });

  test('elasticVersion must be a string', () => {
    expect(testMigrationOpts({ elasticVersion: 32 }))
      .rejects.toThrow(/"elasticVersion" must be a string/);
  });

  test('plugins are required', () => {
    expect(testMigrationOpts({ plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be an object', () => {
    expect(testMigrationOpts({ callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(testMigrationOpts({ index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(testMigrationOpts({ plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });

  test('force must be a boolean if specified', () => {
    expect(testMigrationOpts({ force: 99 }))
      .rejects.toThrow(/"force" must be a boolean/);
  });
});

function assocMigrationState(data, index, migrationState) {
  return _.set(data, [index, MigrationState.ID], {
    _version: 42,
    _source: {
      type: MigrationState.TYPE,
      migration: migrationState,
    },
  });
}

function testMigrationOpts(opts) {
  return migrate({
    callCluster: _.noop,
    log: _.noop,
    index: 'kibana',
    elasticVersion: '1.2.3',
    plugins: [],
    ...opts,
  });
}

function assocAlias(meta, index, alias) {
  return _.set(meta, ['aliases', alias, index, 'alias', alias], {});
}

function assocMappings(meta, index, mappings) {
  return _.set(meta, ['mappings', index, 'doc', 'properties'], mappings);
}
