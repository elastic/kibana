const _ = require('lodash');
const { migrate } = require('./migrate');
const { mockCluster } = require('./test');
const { MigrationState, Plugins } = require('./lib');

describe('migrate', () => {
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
    await migrate({ callCluster, log, elasticVersion, index, plugins, destIndex: '.mufasa-original' });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('generates the dest index if it is not provided', async () => {
    const plugins = [{
      id: 'hoi',
      mappings: {
        stuff: { type: 'integer' },
      },
    }];
    const index = '.mufasa';
    const callCluster = mockCluster({ [index]: { } }, {});
    const minIndexName = `${index}-7.7.7-${new Date().getUTCFullYear()}`;
    const maxIndexName = `${index}-7.7.7-${new Date().getUTCFullYear() + 1}`;
    const { destIndex } = await migrate({ callCluster, index, plugins, log, elasticVersion: '7.7.7' });

    expect(callCluster.state().data[destIndex]).toBeTruthy();
    expect(callCluster.state().meta.aliases[index][destIndex]).toBeTruthy();
    expect(destIndex > minIndexName).toBeTruthy();
    expect(destIndex < maxIndexName).toBeTruthy();
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
    await migrate({ callCluster, index, plugins, log, elasticVersion, destIndex: 'mufasa-v1' });
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
    await migrate({ callCluster, index, plugins, elasticVersion, log, initialIndex: '.mufasa-v1' });
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
    await migrate({ callCluster, index, plugins, elasticVersion, log, initialIndex: '.music-dest' });
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
    await migrate({ callCluster, index, plugins, elasticVersion, log, destIndex: 'gentleman-v2' });
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
    await migrate({ callCluster, index, elasticVersion, log, plugins: [plugin1, plugin2], destIndex: 'groovystuff-v2' });
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
    await migrate({ callCluster, index, elasticVersion, log, plugins: [pluginV2], destIndex: 'aquatica-2' });
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
    const result = await migrate({ callCluster, index, elasticVersion, log, force: true, plugins: [pluginV2], destIndex: 'skippy-2' });
    expect(result.destIndex).not.toEqual(result.index);
    expect(result.status).toEqual('migrated');
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
    await migrate({ callCluster, index, elasticVersion, log, plugins: pluginsV2, destIndex: 'disabled-scenario-2' });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('index is required', () => {
    expect(testMigrationOpts({ index: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('callCluster is required', () => {
    expect(testMigrationOpts({ callCluster: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('log is required', () => {
    expect(testMigrationOpts({ log: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('log must be a function', () => {
    expect(testMigrationOpts({ log: 'hello' }))
      .rejects.toThrow(/Got string/);
  });

  test('elasticVersion is required', () => {
    expect(testMigrationOpts({ elasticVersion: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('elasticVersion must be a string', () => {
    expect(testMigrationOpts({ elasticVersion: 32 }))
      .rejects.toThrow(/Got number/);
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

  test('destIndex must be a string', () => {
    expect(testMigrationOpts({ destIndex: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('initialIndex must be a string', () => {
    expect(testMigrationOpts({ initialIndex: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('plugins must be an array', () => {
    expect(testMigrationOpts({ plugins: 'notright' }))
      .rejects.toThrow(/Got string/);
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
