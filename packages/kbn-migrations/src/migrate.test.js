const { MIGRATION_DOC_TYPE, MIGRATION_DOC_ID } = require('./lib/documents');
const _ = require('lodash');
const { migrate } = require('./migrate');
const { mockServer } = require('./test');
const { buildMigrationState, sanitizePlugins } = require('./lib');

describe('migrate', () => {
  test('does nothing if there are no migrations defined', async () => {
    const plugins = [];
    const index = '.amazemazing';
    const { server, cluster } = mockServer({});
    await migrate({ server, index, plugins });
    expect(cluster.state())
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
    const { server, cluster } = mockServer({});
    await migrate({ server, index, plugins, destIndex: '.mufasa-original' });
    expect(cluster.state())
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
    const { server, cluster } = mockServer({ [index]: { } });
    const minIndexName = `${index}-${new Date().getUTCFullYear()}`;
    const maxIndexName = `${index}-${new Date().getUTCFullYear() + 1}`;
    const { destIndex } = await migrate({ server, index, plugins });

    expect(cluster.state().data[destIndex]).toBeTruthy();
    expect(cluster.state().meta.aliases[index][destIndex]).toBeTruthy();
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
    const { server, cluster } = mockServer(existingData, existingMeta);
    await migrate({ server, index, plugins, destIndex: 'mufasa-v1' });
    expect(cluster.state())
      .toMatchSnapshot();
  });

  test('race-condition for new indices, migration fails if attempted to run in parallel', async () => {
    const plugins = [{
      id: 'hoi',
      migrations: [{ id: 'm1', filter: () => true, transform: _.identity }],
    }];
    const index = '.mufasa';
    const { server } = mockServer({});
    const results = await Promise.all([
      migrate({ server, index, plugins })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ server, index, plugins })
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
    const originalMigrationState = buildMigrationState([pluginV1]);
    const pluginV2 = {
      ...pluginV1,
      migrations: [...pluginV1.migrations, { id: 'm2', filter: () => true, transform: _.identity }],
    };
    const existingData = assocMigrationState({}, index, originalMigrationState);
    const existingMeta = assocAlias({}, index, alias);
    const { server } = mockServer(existingData, existingMeta);
    const results = await Promise.all([
      migrate({ server, index: alias, plugins: [pluginV2] })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ server, index: alias, plugins: [pluginV2] })
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
    const { server, cluster } = mockServer({});
    await migrate({ server, index, plugins, initialIndex: '.mufasa-v1' });
    expect(cluster.state())
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
    const { server, cluster } = mockServer({});
    await migrate({ server, index, plugins, initialIndex: '.music-dest' });
    expect(cluster.state())
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
    const { server, cluster } = mockServer(existingData, existingMeta);
    await migrate({ server, index, plugins, destIndex: 'gentleman-v2' });
    expect(cluster.state())
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
    const { server, cluster } = mockServer(existingData, existingMeta);
    await migrate({ server, index, plugins: [plugin1, plugin2], destIndex: 'groovystuff-v2' });
    expect(cluster.state())
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
    const originalMigrationState = buildMigrationState([pluginV1]);
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
    const { server, cluster } = mockServer(existingData, existingMeta);
    await migrate({ server, index, plugins: [pluginV2], destIndex: 'aquatica-2' });
    expect(cluster.state())
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
    const migrationState = buildMigrationState([pluginV2]);
    const pluginV1 = {
      ...pluginV2,
      migrations: [pluginV2.migrations[0]],
    };
    const existingData = assocMigrationState({}, index, migrationState);
    const existingMeta = assocMappings({}, index, pluginV1.mappings);
    const { server } = mockServer(existingData, existingMeta);
    expect(migrate({ server, index, plugins: [pluginV1] }))
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
    const originalMigrationState = buildMigrationState(sanitizePlugins(pluginsV1));
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
    const { server, cluster } = mockServer(existingData, existingMeta);
    await migrate({ server, index, plugins: pluginsV2, destIndex: 'disabled-scenario-2' });
    expect(cluster.state())
      .toMatchSnapshot();
  });
});

function assocMigrationState(data, index, migrationState) {
  return _.set(data, [index, MIGRATION_DOC_ID], {
    _version: 42,
    _source: {
      type: MIGRATION_DOC_TYPE,
      migration: migrationState,
    },
  });
}

function assocAlias(meta, index, alias) {
  return _.set(meta, ['aliases', alias, index, 'alias', alias], {});
}

function assocMappings(meta, index, mappings) {
  return _.set(meta, ['mappings', index, 'doc', 'properties'], mappings);
}
