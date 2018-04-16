const MigrationContext = require('./migration_context');
const { mockKbnServer } = require('../test');

describe('migrationContext', () => {
  test('ensures that migrations are not undefined', async () => {
    const plugins = [
      { id: 'a', migrations: [{ id: 'shazm' }] },
      { id: 'b' },
    ];
    const actual = await testMigrationContext({ plugins });
    expect(actual.plugins.length).toEqual(1);
    expect(actual.plugins[0].migrations).toEqual([{ id: 'shazm' }]);
  });

  test('creates destIndex name', async () => {
    const actual = await testMigrationContext({ index: 'dang' }, '2.0.4');
    const year = new Date().getFullYear().toString();
    const regexp = new RegExp(`^dang-2.0.4-${year}`);
    expect(actual.destIndex)
      .toEqual(expect.stringMatching(regexp));
  });

  test('creates a logger that logs info', async () => {
    const logs = [];
    const opts = buildOpts({});
    opts.kbnServer.server.log = (...args) => logs.push(args);
    const actual = await MigrationContext.fetch(opts);
    actual.log.info('Wat up?');
    actual.log.info('Logging, sucka!');
    expect(logs)
      .toEqual([
        [['info', 'migration'], 'Wat up?'],
        [['info', 'migration'], 'Logging, sucka!'],
      ]);
  });

  test('creates a logger that logs debug', async () => {
    const logs = [];
    const opts = buildOpts({});
    opts.kbnServer.server.log = (...args) => logs.push(args);
    const actual = await MigrationContext.fetch(opts);
    actual.log.debug('I need coffee');
    actual.log.debug('Lots o coffee');
    expect(logs)
      .toEqual([
        [['debug', 'migration'], 'I need coffee'],
        [['debug', 'migration'], 'Lots o coffee'],
      ]);
  });

  test('accurately computes applied and unapplied migrations', async () => {
    const rawPlugins = [
      { id: 'x-pack', migrations: [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }] },
      { id: 'baz' },
      { id: 'mana', migrations: [{ id: 'mushboom' }, { id: 'rabbite' }] }
    ];
    const migrationState = {
      _source: {
        migration: {
          plugins: [
            { id: 'x-pack', migrationIds: ['foo'] },
            { id: 'mana', migrationIds: ['mushboom'] },
          ],
        },
      },
    };
    const { migrationPlan } = await testMigrationContext({ plugins: rawPlugins, migrationState });

    expect(migrationPlan.migrations.length).toEqual(3);
    expect(migrationPlan.migrations.map(({ id, pluginId }) => ({ id, pluginId })))
      .toEqual([
        { pluginId: 'x-pack', id: 'bar' },
        { pluginId: 'x-pack', id: 'baz' },
        { pluginId: 'mana', id: 'rabbite' },
      ]);
  });

  test('errors if migration order has changed', () => {
    const plugins = [
      { id: 'x-pack', migrations: [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }] },
    ];
    const migrationState = {
      _source: {
        migration: {
          plugins: [{ id: 'x-pack', migrationIds: ['foo', 'baz', 'bar'] }],
        },
      },
    };
    return expect(testMigrationContext({ plugins, migrationState }))
      .rejects.toThrowError(/Expected migration "baz", but found "bar"/);
  });

  test('errors if migrations are defined more than once', () => {
    const plugins = [{
      id: 'x-pack',
      migrations: [{ id: 'foo' }, { id: 'bar' }, { id: 'foo' }],
    }];
    expect(testMigrationContext({ plugins }))
      .rejects.toThrowError(/has migration "foo" defined more than once/);
  });

  test('index is required', () => {
    expect(testMigrationContext({ index: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('kbnServer is required', () => {
    expect(testMigrationContext({ kbnServer: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('plugins are required', () => {
    expect(testMigrationContext({ plugins: undefined }))
      .rejects.toThrow(/Got undefined/);
  });

  test('kbnServer must be an object', () => {
    expect(testMigrationContext({ kbnServer: 'hello' }))
      .rejects.toThrow(/Got string/);
  });

  test('index must be a string', () => {
    expect(testMigrationContext({ index: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('destIndex must be a string', () => {
    expect(testMigrationContext({ destIndex: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('initialIndex must be a string', () => {
    expect(testMigrationContext({ initialIndex: 23 }))
      .rejects.toThrow(/Got number/);
  });

  test('plugins must be an array', () => {
    expect(testMigrationContext({ plugins: 'notright' }))
      .rejects.toThrow(/Got string/);
  });

  function buildOpts(opts, version) {
    const index = 'test-index';
    const data = {
      [index]: {
        'migration:migration-state': opts.migrationState,
      },
    };
    const { kbnServer } = mockKbnServer(data, {}, version);
    return {
      index,
      kbnServer,
      plugins: opts.plugins || [],
      ...opts,
    };
  }

  async function testMigrationContext(testOpts, version) {
    const opts = buildOpts(testOpts, version);
    return MigrationContext.fetch(opts);
  }
});
