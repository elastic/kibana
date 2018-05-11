const MigrationContext = require('./migration_context');
const { testCluster } = require('../test');

describe('migrationContext', () => {
  test('generates predictable index names', async () => {
    const actual = await testMigrationContext({ index: 'dang' }, '2.0.4');
    expect(actual.destIndex)
      .toEqual('dang-2.0.4-989db2448f309bfdd99b513f37c84b8f5794d2b5');
    expect(actual.initialIndex)
      .toEqual('dang-2.0.4-original');
  });

  test('creates a logger that logs info', async () => {
    const logs = [];
    const opts = await buildOpts({});
    opts.log = (...args) => logs.push(args);
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
    const opts = await buildOpts({});
    opts.log = (...args) => logs.push(args);
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
      { id: 'mana', migrations: [{ id: 'mushboom' }, { id: 'rabbite' }] }
    ];
    const migrationState = {
      plugins: [
        { id: 'x-pack', migrationIds: ['foo'] },
        { id: 'mana', migrationIds: ['mushboom'] },
      ],
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
      plugins: [{ id: 'x-pack', migrationIds: ['foo', 'baz', 'bar'] }],
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

  test('lower-cases index name', async () => {
    const { initialIndex, destIndex } = await testMigrationContext({}, '1.2.3-BIG');
    expect(initialIndex).toEqual('.sample-index-1.2.3-big-original');
    expect(destIndex).toEqual('.sample-index-1.2.3-big-989db2448f309bfdd99b513f37c84b8f5794d2b5');
  });

  async function buildOpts(opts, elasticVersion = '9.8.7') {
    const existingDocs = !opts.migrationState ? undefined : [{
      id: 'migration-state',
      type: 'migration',
      attributes: opts.migrationState,
    }];
    const { index, callCluster } = await testCluster({ existingDocs });
    return {
      index,
      elasticVersion,
      log: () => {},
      callCluster,
      plugins: opts.plugins || [],
      ...opts,
    };
  }

  async function testMigrationContext(testOpts, version) {
    const opts = await buildOpts(testOpts, version);
    return MigrationContext.fetch(opts);
  }
});
