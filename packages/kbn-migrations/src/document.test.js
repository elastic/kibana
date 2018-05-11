const _ = require('lodash');
const Document = require('./document');
const { MigrationState, Plugin } = require('./lib');
const { testPlugins, testCluster } = require('./test');

describe('Document', () => {
  const opts = {
    callCluster: _.noop,
    log: _.noop,
    index: 'kibana',
    docs: [],
    migrationState: {},
    plugins: [],
  };

  test('rejects docs with plugins we know nothing about', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster({ plugins });
    const migrationState = {
      plugins: [{
        id: 'whatisit',
        mappings: JSON.stringify({ dunnoes: { type: 'text' } }),
        migrationIds: [],
        checksum: 'w1',
      }],
    };
    const doc = {
      id: 'hrm',
      type: 'dunnoes',
      attributes: 'This should get rejected, methinks.',
    };
    expect(Document.transform({ callCluster, migrationState, plugins, index, docs: [doc] }))
      .rejects.toThrow(/unavailable plugin \"whatisit\"/);
  });

  test('importing a doc w/ no exported migration state runs all transforms', async () => {
    const plugins = Plugin.sanitize([{
      id: 'jam',
      mappings: { space: { type: 'text' } },
      migrations: [{
        id: 'a',
        filter: () => true,
        transform: (doc) => ({ ...doc, attributes: `space ${doc.attributes}` }),
      }, {
        id: 'b',
        filter: () => true,
        transform: (doc) => ({ ...doc, attributes: `${doc.attributes.toUpperCase()}!!!` }),
      }],
    }]);
    const { index, callCluster } = await testCluster({ plugins });
    const docs = [{
      id: 'enterprise',
      type: 'space',
      attributes: 'The final frontier',
    }];
    const transformed = await Document.transform({ callCluster, migrationState: {}, plugins, index, docs });
    expect(transformed)
      .toEqual([{
        id: 'enterprise',
        type: 'space',
        attributes: 'SPACE THE FINAL FRONTIER!!!',
      }]);
  });

  test('Transforms old docs', async () => {
    const plugins = Plugin.sanitize([{
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
    }]);
    const { index, callCluster } = await testCluster({ plugins });
    const migrationState = {
      plugins: [{
        id: 'jam',
        mappings: JSON.stringify({ space: { type: 'text' } }),
        migrationIds: ['a'],
        checksum: 'ahoy',
      }, {
        id: 'maican',
        mappings: JSON.stringify({ book: { type: 'text' } }),
        migrationIds: ['m1'],
        checksum: '4',
      }],
    };
    const docs = [
      { id: 'enterprise', type: 'space', attributes: 'The final frontier' },
      { id: 'thetwotowers', type: 'book', attributes: 'The Two Towers' },
    ];
    const transformed = await Document.transform({ callCluster, migrationState, plugins, index, docs });

    expect(transformed)
      .toEqual([
        { id: 'enterprise', type: 'space', attributes: 'THE FINAL FRONTIER!!!' },
        { id: 'thetwotowers', type: 'book', attributes: 'Title: The Two Towers' },
      ]);
  });

  test('Exported migration state does not need to specify mappings', async () => {
    const plugins = Plugin.sanitize([{
      id: 'jam',
      mappings: { space: { type: 'text' } },
      migrations: [{
        id: 'a',
        filter: ({ type }) => type === 'space',
        transform: () => { throw new Error('Should not run!'); },
      }, {
        id: 'b',
        filter: ({ type }) => type === 'space',
        transform: (doc) => ({ ...doc, attributes: `${doc.attributes.toUpperCase()}!!!` }),
      }],
    }]);
    const { index, callCluster } = await testCluster({ plugins });
    const migrationState = {
      plugins: [{
        id: 'jam',
        migrationIds: ['a'],
        checksum: 'ahoy',
      }],
    };
    const docs = [{ id: 'enterprise', type: 'space', attributes: 'The final frontier' }];
    const transformed = await Document.transform({ callCluster, migrationState, plugins, index, docs });

    expect(transformed)
      .toEqual([{ id: 'enterprise', type: 'space', attributes: 'THE FINAL FRONTIER!!!' }]);
  });

  test('accepts if a disabled plugin is required, but doc is up to date', async () => {
    const plugins = Plugin.sanitize([{
      id: 'jam',
      mappings: { aha: { type: 'text' } },
      migrations: [],
    }]);
    const migrationState = MigrationState.build(plugins);
    const { index, callCluster } = await testCluster({ plugins });
    const docs = [{ id: '123', type: 'aha', attributes: 'Move along' }];
    const transformed = await Document.transform({ callCluster, docs, migrationState, plugins: [], index });
    expect(transformed)
      .toEqual([{ id: '123', type: 'aha', attributes: 'Move along' }]);
  });

  test('throws if migration requires a disabled plugin', async () => {
    const plugins = Plugin.sanitize([{
      id: 'jam',
      mappings: { space: { type: 'text' } },
      migrations: [],
    }]);
    const { index, callCluster } = await testCluster({ plugins });
    const docs = [{
      id: 'enterprise',
      type: 'space',
      attributes: 'The final frontier',
    }];
    expect(Document.transform({ docs, migrationState: {}, plugins: [], callCluster, index }))
      .rejects.toThrow(/requires unavailable plugin \"jam\"/);
  });

  test('index is required', () => {
    expect(Document.transform({ ...opts, index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('docs are required', () => {
    expect(Document.transform({ ...opts, docs: undefined }))
      .rejects.toThrow(/"docs" is required/);
  });

  test('docs should be an array', () => {
    expect(Document.transform({ ...opts, docs: 'hrm' }))
      .rejects.toThrow(/"docs" must be an array/);
  });

  test('migrationState is required', () => {
    expect(Document.transform({ ...opts, migrationState: undefined }))
      .rejects.toThrow(/"migrationState" is required/);
  });

  test('migrationState should be an object', () => {
    expect(Document.transform({ ...opts, migrationState: 'hrm' }))
      .rejects.toThrow(/"migrationState" must be an object/);
  });

  test('callCluster is required', () => {
    expect(Document.transform({ ...opts, callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('plugins are required', () => {
    expect(Document.transform({ ...opts, plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be a function', () => {
    expect(Document.transform({ ...opts, callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(Document.transform({ ...opts, index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(Document.transform({ ...opts, plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });
});
