const _ = require('lodash');
const Document = require('./document');
const { MigrationState } = require('./lib');
const { mockCluster } = require('./test');

describe('Document', () => {
  const index = 'kibana';
  const elasticVersion = '9.8.7';

  test('rejects docs with plugins we know nothing about', async () => {
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        mappingsChecksum: '2',
        migrationsChecksum: 'ahoy',
      }],
    });
    const callCluster = mockCluster(data, meta);
    const migrationState = {
      plugins: [{
        id: 'whatisit',
        mappings: JSON.stringify({ dunnoes: { type: 'text' } }),
        migrationIds: ['dang'],
        mappingsChecksum: 'w1',
        migrationsChecksum: 'w2',
      }],
    };
    const plugins = [{
      id: 'jam',
      migrations: [],
    }];
    const doc = {
      id: 'hrm',
      type: 'dunnoes',
      attributes: 'This should get rejected, methinks.',
    };
    expect(Document.transform({ callCluster, migrationState, plugins, elasticVersion, index, docs: [doc] }))
      .rejects.toThrow(/unavailable plugin \"whatisit\"/);
  });

  test('importing a doc w/ no exported migration state runs all transforms', async () => {
    const migrationState = {};
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        migrationIds: ['a', 'b'],
        mappingsChecksum: '2',
        migrationsChecksum: 'ahoy',
      }],
    });
    const callCluster = mockCluster(data, meta);
    const plugins = [{
      id: 'jam',
      migrations: [{
        id: 'a',
        filter: () => true,
        transform: (doc) => ({ ...doc, attributes: `space ${doc.attributes}` }),
      }, {
        id: 'b',
        filter: () => true,
        transform: (doc) => ({ ...doc, attributes: `${doc.attributes.toUpperCase()}!!!` }),
      }],
    }];
    const docs = [{
      id: 'enterprise',
      type: 'space',
      attributes: 'The final frontier',
    }];
    const transformed = await Document.transform({ callCluster, migrationState, plugins, elasticVersion, index, docs });

    expect(transformed)
      .toEqual([{
        id: 'enterprise',
        type: 'space',
        attributes: 'SPACE THE FINAL FRONTIER!!!',
      }]);
  });

  test('Transforms old docs', async () => {
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        mappingsChecksum: '2',
        migrationsChecksum: 'ahoy',
      }, {
        id: 'maican',
        mappings: JSON.stringify({ book: { type: 'text' } }),
        mappingsChecksum: '3',
        migrationsChecksum: '4',
      }],
    });
    const callCluster = mockCluster(data, meta);
    const migrationState = {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        migrationIds: ['a'],
        mappingsChecksum: '1',
        migrationsChecksum: 'ahoy',
      }, {
        id: 'maican',
        mappings: JSON.stringify({ book: { type: 'text' } }),
        migrationIds: ['m1'],
        mappingsChecksum: '3',
        migrationsChecksum: '4',
      }],
    };
    const plugins = [{
      id: 'jam',
      migrations: [{
        id: 'a',
        filter: ({ type }) => type === 'space',
        transform: () => { throw new Error('Should not run!'); },
      }, {
        id: 'b',
        filter: ({ type }) => type === 'space',
        transform: (doc) => ({ ...doc, attributes: `${doc.attributes.toUpperCase()}!!!` }),
      }],
    }, {
      id: 'maican',
      migrations: [{
        id: 'm1',
        filter: ({ type }) => type === 'book',
        transform: () => { throw new Error('Should not run!'); },
      }, {
        id: 'm2',
        filter: ({ type }) => type === 'book',
        transform: (doc) => ({ ...doc, attributes: `Title: ${doc.attributes}` }),
      }],
    }];
    const docs = [
      { id: 'enterprise', type: 'space', attributes: 'The final frontier' },
      { id: 'thetwotowers', type: 'book', attributes: 'The Two Towers' },
    ];
    const transformed = await Document.transform({ callCluster, migrationState, plugins, elasticVersion, index, docs });

    expect(transformed)
      .toEqual([
        { id: 'enterprise', type: 'space', attributes: 'THE FINAL FRONTIER!!!' },
        { id: 'thetwotowers', type: 'book', attributes: 'Title: The Two Towers' },
      ]);
  });

  test('Exported migration state does not need to specify mappings', async () => {
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        migrationIds: ['a', 'b'],
        mappings: JSON.stringify({ space: { type: 'text' } }),
        mappingsChecksum: '2',
        migrationsChecksum: 'ahoy',
      }],
    });
    const callCluster = mockCluster(data, meta);
    const migrationState = {
      plugins: [{
        id: 'jam',
        migrationIds: ['a'],
        mappingsChecksum: '1',
        migrationsChecksum: 'ahoy',
      }],
    };
    const plugins = [{
      id: 'jam',
      migrations: [{
        id: 'a',
        filter: ({ type }) => type === 'space',
        transform: () => { throw new Error('Should not run!'); },
      }, {
        id: 'b',
        filter: ({ type }) => type === 'space',
        transform: (doc) => ({ ...doc, attributes: `${doc.attributes.toUpperCase()}!!!` }),
      }],
    }];
    const docs = [{ id: 'enterprise', type: 'space', attributes: 'The final frontier' }];
    const transformed = await Document.transform({ callCluster, migrationState, plugins, elasticVersion, index, docs });

    expect(transformed)
      .toEqual([{ id: 'enterprise', type: 'space', attributes: 'THE FINAL FRONTIER!!!' }]);
  });

  test('accepts if a disabled plugin is required, but doc is up to date', async () => {
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ aha: { type: 'text' } }),
        mappingsChecksum: 'aha',
        migrationsChecksum: 'ahoy',
      }],
    });
    const callCluster = mockCluster(data, meta);
    const migrationState = {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ aha: { type: 'text' } }),
        mappingsChecksum: 'aha',
        migrationsChecksum: 'ahoy',
        migrationIds: [],
      }],
    };
    const plugins = [];
    const docs = [{ id: '123', type: 'aha', attributes: 'Move along' }];
    const transformed = await Document.transform({ callCluster, docs, migrationState, plugins, index, elasticVersion });
    expect(transformed)
      .toEqual([{ id: '123', type: 'aha', attributes: 'Move along' }]);
  });

  test('throws if migration requires a disabled plugin', () => {
    const { data, meta } = clusterData(index, {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        mappingsChecksum: 'aha',
        migrationsChecksum: 'ahoy',
        migrationIds: [],
      }],
    });
    const callCluster = mockCluster(data, meta);
    const migrationState = {};
    const plugins = [];
    const docs = [{
      id: 'enterprise',
      type: 'space',
      attributes: 'The final frontier',
    }];
    expect(Document.transform({ docs, migrationState, plugins, callCluster, elasticVersion, index }))
      .rejects.toThrow(/requires unavailable plugin \"jam\"/);
  });

  test('index is required', () => {
    expect(testImportOpts({ index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('docs are required', () => {
    expect(testImportOpts({ docs: undefined }))
      .rejects.toThrow(/"docs" is required/);
  });

  test('docs should be an array', () => {
    expect(testImportOpts({ docs: 'hrm' }))
      .rejects.toThrow(/"docs" must be an array/);
  });

  test('migrationState is required', () => {
    expect(testImportOpts({ migrationState: undefined }))
      .rejects.toThrow(/"migrationState" is required/);
  });

  test('migrationState should be an object', () => {
    expect(testImportOpts({ migrationState: 'hrm' }))
      .rejects.toThrow(/"migrationState" must be an object/);
  });

  test('callCluster is required', () => {
    expect(testImportOpts({ callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('plugins are required', () => {
    expect(testImportOpts({ plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be a function', () => {
    expect(testImportOpts({ callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(testImportOpts({ index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(testImportOpts({ plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });
});

function testImportOpts(opts) {
  return Document.transform({
    callCluster: _.noop,
    log: _.noop,
    index: 'kibana',
    docs: [],
    migrationState: {},
    plugins: [],
    ...opts,
  });
}

function clusterData(index, migrationState) {
  const data = {
    [index]: {
      [MigrationState.ID]: {
        _source: {
          migration: migrationState,
        },
      },
    },
  };
  const meta = {
    mappings: {
      [index]: {
        doc: {
          properties: _.reduce(
            migrationState.plugins,
            (acc, { mappings }) => Object.assign(acc, JSON.parse(mappings)),
            _.cloneDeep(MigrationState.mappings),
          ),
        },
      },
    },
  };
  return { data, meta };
}
