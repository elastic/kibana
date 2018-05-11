const _ = require('lodash');
const { migrate, computeStatus } = require('./migration');
const { testCluster, testPlugins } = require('./test');
const { MigrationStatus } = require('./lib');

const opts = {
  log: _.noop,
  elasticVersion: '3.2.1',
  index: '.test-index',
  callCluster: _.noop,
  plugins: [],
};

describe('Migration.computeStatus', () => {
  test('is migrated, if the stored migration state matches the plugin state', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster({ plugins });
    const actual = await computeStatus({ callCluster, index, plugins });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is not migrated, if there is no stored migration state', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster();
    const actual = await computeStatus({ callCluster, plugins, index });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('is migrated, if there is no stored state and no plugins with migrations', async () => {
    const plugins = [];
    const { index, callCluster } = await testCluster();
    const actual = await computeStatus({ callCluster, plugins, index });
    expect(actual).toEqual(MigrationStatus.migrated);
  });

  test('is outOfDate if mappings change', async () => {
    const pluginV1 = testPlugins.v1[0];
    const { index, callCluster } = await testCluster({ plugins: [pluginV1] });
    const pluginV2 = { ...pluginV1, mappings: { whatever: { type: 'keyword' } } };
    const actual = await computeStatus({ callCluster, index, plugins: [pluginV2] });
    expect(actual).toEqual(MigrationStatus.outOfDate);
  });

  test('index is required', () => {
    expect(computeStatus({ ...opts, index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('callCluster is required', () => {
    expect(computeStatus({ ...opts, callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('plugins are required', () => {
    expect(computeStatus({ ...opts, plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be an object', () => {
    expect(computeStatus({ ...opts, callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(computeStatus({ ...opts, index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(computeStatus({ ...opts, plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });
});

describe('Migration.migrate', () => {
  test('does nothing if there are no migrations defined', async () => {
    const plugins = [];
    const { index, callCluster } = await testCluster({});
    await migrate({ ...opts, index, plugins, callCluster });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('creates the index and alias if it does not exist', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster();
    await migrate({ ...opts, index, plugins, callCluster });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('existing indices are converted to aliases and migrated', async () => {
    const existingDocs = [{
      id: '2',
      type: 'shut_the_front_door',
      attributes: {
        meaning: 42,
      },
    }, {
      id: 'for-old-plugin-1',
      type: 'p3',
      attributes: {
        shtuff: 'Old Shtuff',
      },
    }];
    const plugins = testPlugins.v2;
    const { index, callCluster } = await testCluster({ existingDocs });
    await migrate({ ...opts, index, plugins, callCluster });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('race-condition for new indices, migration fails if attempted to run in parallel', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster();
    const results = await Promise.all([
      migrate({ ...opts, index, plugins, callCluster  })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ ...opts, index, plugins, callCluster  })
        .catch(({ statusCode }) => ({ status: statusCode })),
    ]);
    expect(results[0].status).toEqual(MigrationStatus.migrated);
    expect(results[1].status).toEqual(400);
  });

  test('race-condition version is used for optimistic concurrency', async () => {
    const plugins = testPlugins.v2;
    const { index, callCluster } = await testCluster({ plugins: testPlugins.v1 });
    const results = await Promise.all([
      migrate({ ...opts, index, plugins, callCluster  })
        .catch(({ statusCode }) => ({ status: statusCode })),
      migrate({ ...opts, index, plugins, callCluster  })
        .catch(({ statusCode }) => ({ status: statusCode })),
    ]);
    expect(results[0].status).toEqual(MigrationStatus.migrated);
    expect(results[1].status).toEqual(409);
  });

  test('Migrations are skipped if index is marked as migrating', async () => {
    const plugins = testPlugins.v1;
    const existingDocs = [{
      id: 'migration-state',
      type: 'migration',
      attributes: {
        status: MigrationStatus.migrating,
        plugins: [],
      },
    }];
    const { index, callCluster } = await testCluster({ existingDocs });
    const { status } = await migrate({ ...opts, index, plugins, callCluster });
    expect(status).toEqual(MigrationStatus.migrating);
  });

  test('existing previously migrated index only runs new migrations', async () => {
    const plugins = testPlugins.v2;
    const { index, callCluster } = await testCluster({ plugins: testPlugins.v1 });
    // Update a doc and then verify that v1 transforms weren't applied to it...
    await callCluster('update', {
      index,
      type: 'doc',
      id: 'p1:sample',
      body: { doc: { type: 'p1', p1: { name: 'This Was Updated' } } }
    });
    await migrate({ ...opts, index, plugins, callCluster });
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('migrations will run, if forced even if index is in migrating state', async () => {
    const plugins = testPlugins.v1;
    const existingDocs = [{
      id: 'migration-state',
      type: 'migration',
      attributes: {
        status: MigrationStatus.migrating,
        plugins: [],
      },
    }];
    const { index, callCluster } = await testCluster({ existingDocs });
    const { status } = await migrate({ ...opts, index, plugins, callCluster, force: true });
    expect(status).toEqual(MigrationStatus.migrated);
    expect(callCluster.state())
      .toMatchSnapshot();
  });

  test('errors if index has later migrations than the current plugins allow', async () => {
    const plugins = testPlugins.v1;
    const { index, callCluster } = await testCluster({ plugins: testPlugins.v2 });
    expect(migrate({ ...opts, index, plugins, callCluster }))
      .rejects.toThrow(/migration order has changed/);
  });

  test('index is required', () => {
    expect(migrate({ ...opts, index: undefined }))
      .rejects.toThrow(/"index" is required/);
  });

  test('callCluster is required', () => {
    expect(migrate({ ...opts, callCluster: undefined }))
      .rejects.toThrow(/"callCluster" is required/);
  });

  test('log is required', () => {
    expect(migrate({ ...opts, log: undefined }))
      .rejects.toThrow(/"log" is required/);
  });

  test('log must be a function', () => {
    expect(migrate({ ...opts, log: 'hello' }))
      .rejects.toThrow(/"log" must be a Function/);
  });

  test('elasticVersion is required', () => {
    expect(migrate({ ...opts, elasticVersion: undefined }))
      .rejects.toThrow(/"elasticVersion" is required/);
  });

  test('elasticVersion must be a string', () => {
    expect(migrate({ ...opts, elasticVersion: 32 }))
      .rejects.toThrow(/"elasticVersion" must be a string/);
  });

  test('plugins are required', () => {
    expect(migrate({ ...opts, plugins: undefined }))
      .rejects.toThrow(/"plugins" is required/);
  });

  test('callCluster must be an object', () => {
    expect(migrate({ ...opts, callCluster: 'hello' }))
      .rejects.toThrow(/"callCluster" must be a Function/);
  });

  test('index must be a string', () => {
    expect(migrate({ ...opts, index: 23 }))
      .rejects.toThrow(/"index" must be a string/);
  });

  test('plugins must be an array', () => {
    expect(migrate({ ...opts, plugins: 'notright' }))
      .rejects.toThrow(/"plugins" must be an array/);
  });

  test('force must be a boolean if specified', () => {
    expect(migrate({ ...opts, force: 99 }))
      .rejects.toThrow(/"force" must be a boolean/);
  });
});
