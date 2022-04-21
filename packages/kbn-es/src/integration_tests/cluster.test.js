/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { ES_NOPASSWORD_P12_PATH } = require('@kbn/dev-utils');
const { ToolingLog, ToolingLogCollectingWriter } = require('@kbn/tooling-log');
const { createAnyInstanceSerializer, createStripAnsiSerializer } = require('@kbn/jest-serializers');
const execa = require('execa');
const { Cluster } = require('../cluster');
const { installSource, installSnapshot, installArchive } = require('../install');
const { extractConfigFiles } = require('../utils/extract_config_files');

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));
expect.addSnapshotSerializer(createStripAnsiSerializer());

jest.mock('../install', () => ({
  installSource: jest.fn(),
  installSnapshot: jest.fn(),
  installArchive: jest.fn(),
}));

jest.mock('execa', () => jest.fn());
jest.mock('../utils/extract_config_files', () => ({
  extractConfigFiles: jest.fn(),
}));

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureNoResolve(promise) {
  await Promise.race([
    sleep(100),
    promise.then(() => {
      throw new Error('promise was not supposed to resolve');
    }),
  ]);
}

async function ensureResolve(promise) {
  return await Promise.race([
    promise,
    sleep(100).then(() => {
      throw new Error('promise was supposed to resolve with installSource() resolution');
    }),
  ]);
}

function mockEsBin({ exitCode, start }) {
  execa.mockImplementationOnce((cmd, args, options) =>
    jest.requireActual('execa')(
      process.execPath,
      [
        require.resolve('./__fixtures__/es_bin.js'),
        JSON.stringify({
          exitCode,
          start,
          ssl: args.includes('xpack.security.http.ssl.enabled=true'),
        }),
      ],
      options
    )
  );
}

const initialEnv = { ...process.env };

beforeEach(() => {
  jest.resetAllMocks();
  extractConfigFiles.mockImplementation((config) => config);
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

afterEach(() => {
  process.env = { ...initialEnv };
});

describe('#installSource()', () => {
  it('awaits installSource() promise and returns { installPath }', async () => {
    let resolveInstallSource;
    installSource.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallSource = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installSource();
    await ensureNoResolve(promise);
    resolveInstallSource();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  it('passes through all options+log to installSource()', async () => {
    installSource.mockResolvedValue({});
    const cluster = new Cluster({ log });
    await cluster.installSource({ foo: 'bar' });
    expect(installSource.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "foo": "bar",
            "log": <ToolingLog>,
          },
        ],
      ]
    `);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info source[@kbn/es Cluster] Installing from source",
      ]
    `);
  });

  it('rejects if installSource() rejects', async () => {
    installSource.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installSource()).rejects.toThrowError('foo');
  });
});

describe('#installSnapshot()', () => {
  it('awaits installSnapshot() promise and returns { installPath }', async () => {
    let resolveInstallSnapshot;
    installSnapshot.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallSnapshot = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installSnapshot();
    await ensureNoResolve(promise);
    resolveInstallSnapshot();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  it('passes through all options+log to installSnapshot()', async () => {
    installSnapshot.mockResolvedValue({});
    const cluster = new Cluster({ log });
    await cluster.installSnapshot({ foo: 'bar' });
    expect(installSnapshot.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "foo": "bar",
            "log": <ToolingLog>,
          },
        ],
      ]
    `);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info source[@kbn/es Cluster] Installing from snapshot",
      ]
    `);
  });

  it('rejects if installSnapshot() rejects', async () => {
    installSnapshot.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installSnapshot()).rejects.toThrowError('foo');
  });
});

describe('#installArchive(path)', () => {
  it('awaits installArchive() promise and returns { installPath }', async () => {
    let resolveInstallArchive;
    installArchive.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallArchive = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installArchive();
    await ensureNoResolve(promise);
    resolveInstallArchive();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  it('passes through path and all options+log to installArchive()', async () => {
    installArchive.mockResolvedValue({});
    const cluster = new Cluster({ log });
    await cluster.installArchive('path', { foo: 'bar' });
    expect(installArchive.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "path",
          Object {
            "foo": "bar",
            "log": <ToolingLog>,
          },
        ],
      ]
    `);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info source[@kbn/es Cluster] Installing from an archive",
      ]
    `);
  });

  it('rejects if installArchive() rejects', async () => {
    installArchive.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installArchive()).rejects.toThrowError('foo');
  });
});

describe('#start(installPath)', () => {
  it('rejects when bin/elasticsearch exists with 0 before starting', async () => {
    mockEsBin({ exitCode: 0, start: false });

    await expect(new Cluster({ log }).start()).rejects.toThrowError('ES exited without starting');
  });

  it('rejects when bin/elasticsearch exists with 143 before starting', async () => {
    mockEsBin({ exitCode: 143, start: false });

    await expect(new Cluster({ log }).start()).rejects.toThrowError('ES exited without starting');
  });

  it('rejects when bin/elasticsearch exists with 130 before starting', async () => {
    mockEsBin({ exitCode: 130, start: false });

    await expect(new Cluster({ log }).start()).rejects.toThrowError('ES exited without starting');
  });

  it('rejects when bin/elasticsearch exists with 1 before starting', async () => {
    mockEsBin({ exitCode: 1, start: false });

    await expect(new Cluster({ log }).start()).rejects.toThrowError('ES exited with code 1');
  });

  it('resolves when bin/elasticsearch logs "started"', async () => {
    mockEsBin({ start: true });

    await new Cluster({ log }).start();
  });

  it('rejects if #start() was called previously', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.start();
    await expect(cluster.start()).rejects.toThrowError('ES has already been started');
  });

  it('rejects if #run() was called previously', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.run();
    await expect(cluster.start()).rejects.toThrowError('ES has already been started');
  });

  it('sets up SSL when enabled', async () => {
    mockEsBin({ start: true, ssl: true });

    const cluster = new Cluster({ log, ssl: true });
    await cluster.start();

    const config = extractConfigFiles.mock.calls[0][0];
    expect(config).toContain('xpack.security.http.ssl.enabled=true');
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_NOPASSWORD_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
  });

  it(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });

    extractConfigFiles.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.start();

    expect(extractConfigFiles.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            "action.destructive_requires_name=true",
            "ingest.geoip.downloader.enabled=false",
            "search.check_ccs_compatibility=true",
            "cluster.routing.allocation.disk.threshold_enabled=false",
          ],
          undefined,
          Object {
            "log": <ToolingLog>,
          },
        ],
      ]
    `);
  });
});

describe('#run()', () => {
  it('resolves when bin/elasticsearch exists with 0', async () => {
    mockEsBin({ exitCode: 0 });

    await new Cluster({ log }).run();
  });

  it('resolves when bin/elasticsearch exists with 143', async () => {
    mockEsBin({ exitCode: 143 });

    await new Cluster({ log }).run();
  });

  it('resolves when bin/elasticsearch exists with 130', async () => {
    mockEsBin({ exitCode: 130 });

    await new Cluster({ log }).run();
  });

  it('rejects when bin/elasticsearch exists with 1', async () => {
    mockEsBin({ exitCode: 1 });

    await expect(new Cluster({ log }).run()).rejects.toThrowError('ES exited with code 1');
  });

  it('rejects if #start() was called previously', async () => {
    mockEsBin({ exitCode: 0, start: true });

    const cluster = new Cluster({ log });
    await cluster.start();
    await expect(cluster.run()).rejects.toThrowError('ES has already been started');
  });

  it('rejects if #run() was called previously', async () => {
    mockEsBin({ exitCode: 0 });

    const cluster = new Cluster({ log });
    await cluster.run();
    await expect(cluster.run()).rejects.toThrowError('ES has already been started');
  });

  it('sets up SSL when enabled', async () => {
    mockEsBin({ start: true, ssl: true });

    const cluster = new Cluster({ log, ssl: true });
    await cluster.run();

    const config = extractConfigFiles.mock.calls[0][0];
    expect(config).toContain('xpack.security.http.ssl.enabled=true');
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_NOPASSWORD_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
  });

  it(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });

    extractConfigFiles.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.run();

    expect(extractConfigFiles.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            "action.destructive_requires_name=true",
            "ingest.geoip.downloader.enabled=false",
            "search.check_ccs_compatibility=true",
            "cluster.routing.allocation.disk.threshold_enabled=false",
          ],
          undefined,
          Object {
            "log": <ToolingLog>,
          },
        ],
      ]
    `);
  });

  it('sets default Java heap', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.run();

    expect(execa.mock.calls[0][2].env.ES_JAVA_OPTS).toMatchInlineSnapshot(`"-Xms1536m -Xmx1536m"`);
  });

  it('allows Java heap to be overwritten', async () => {
    mockEsBin({ start: true });
    process.env.ES_JAVA_OPTS = '-Xms5g -Xmx5g';

    const cluster = new Cluster({ log });
    await cluster.run();

    expect(execa.mock.calls[0][2].env.ES_JAVA_OPTS).toMatchInlineSnapshot(`"-Xms5g -Xmx5g"`);
  });
});

describe('#stop()', () => {
  it('rejects if #run() or #start() was not called', async () => {
    const cluster = new Cluster({ log });
    await expect(cluster.stop()).rejects.toThrowError('ES has not been started');
  });

  it('resolves when ES exits with 0', async () => {
    mockEsBin({ exitCode: 0, start: true });

    const cluster = new Cluster({ log });
    await cluster.start();
    await cluster.stop();
  });

  it('resolves when ES exits with 143', async () => {
    mockEsBin({ exitCode: 143, start: true });

    const cluster = new Cluster({ log });
    await cluster.start();
    await cluster.stop();
  });

  it('resolves when ES exits with 130', async () => {
    mockEsBin({ exitCode: 130, start: true });

    const cluster = new Cluster({ log });
    await cluster.start();
    await cluster.stop();
  });

  it('rejects when ES exits with 1', async () => {
    mockEsBin({ exitCode: 1, start: true });

    const cluster = new Cluster({ log });
    await expect(cluster.run()).rejects.toThrowError('ES exited with code 1');
    await expect(cluster.stop()).rejects.toThrowError('ES exited with code 1');
  });
});
