/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import * as extractConfig from '../utils/extract_config_files';
import { createAnyInstanceSerializer, createStripAnsiSerializer } from '@kbn/jest-serializers';
import * as installUtils from '../install';
import { Cluster } from '../cluster';
import { InstallSourceOptions } from '../install/install_source';
import { InstallSnapshotOptions } from '../install/install_snapshot';
import { InstallArchiveOptions } from '../install/install_archive';
import { ES_NOPASSWORD_P12_PATH } from '@kbn/dev-utils/src/certs';

expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));
expect.addSnapshotSerializer(createStripAnsiSerializer());

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);
const KIBANA_ROOT = process.cwd();
const installPath = `${KIBANA_ROOT}/.es`;
const esClusterExecOptions = {};
const initialEnv = { ...process.env };

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

async function ensureResolve(promise: Promise<unknown>) {
  return await Promise.race([
    promise,
    sleep(100).then(() => {
      throw new Error('promise was supposed to resolve with installSource() resolution');
    }),
  ]);
}

async function ensureNoResolve(promise: Promise<unknown>) {
  await Promise.race([
    sleep(100),
    promise.then(() => {
      throw new Error('promise was not supposed to resolve');
    }),
  ]);
}

jest.mock('execa');
const execaMock = jest.requireMock('execa');

function mockEsBin(
  {
    exitCode,
    start,
    ssl,
  }: {
    exitCode?: number;
    start?: boolean;
    ssl?: boolean;
  } = { start: false, ssl: false }
) {
  execaMock.mockImplementationOnce((args: string[], options: {}) =>
    jest.requireActual('execa')(
      process.execPath,
      [
        '--require=@kbn/babel-register/install',
        require.resolve('./__fixtures__/es_bin.js'),
        JSON.stringify({
          exitCode,
          start,
          ssl: ssl || args.includes('xpack.security.http.ssl.enabled=true'),
        }),
      ],
      options
    )
  );
}

jest.mock('../utils/extract_config_files', () => ({
  extractConfigFiles: jest.fn(),
}));

jest.mock('../install', () => ({
  installSource: jest.fn(),
  installSnapshot: jest.fn(),
  installArchive: jest.fn(),
}));

jest.mock('../utils/extract_config_files', () => ({
  extractConfigFiles: jest.fn(),
}));

const extractConfigMock = jest.spyOn(extractConfig, 'extractConfigFiles');
const installSourceMock = jest.spyOn(installUtils, 'installSource');
const installSnapshotMock = jest.spyOn(installUtils, 'installSnapshot');
const installArchiveMock = jest.spyOn(installUtils, 'installArchive');
const extractConfigFilesMock = jest.spyOn(extractConfig, 'extractConfigFiles');

beforeEach(() => {
  jest.resetAllMocks();
  extractConfigMock.mockImplementation((config) => (Array.isArray(config) ? config : [config]));
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

afterEach(() => {
  process.env = { ...initialEnv };
});

describe('#installSource()', () => {
  test('awaits installSource() promise and returns { installPath }', async () => {
    let resolveInstallSource: Function;
    installSourceMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallSource = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installSource({ sourcePath: 'bar' });
    await ensureNoResolve(promise);
    resolveInstallSource!();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  test('passes through all options+log to installSource()', async () => {
    installSourceMock.mockResolvedValue({ installPath: 'foo' });
    const options: InstallSourceOptions = {
      sourcePath: 'bar',
      license: 'trial',
      password: 'changeme',
      basePath: 'someBasePath',
      installPath: 'someInstallPath',
      esArgs: ['foo=true'],
      log,
    };
    const cluster = new Cluster({ log });
    await cluster.installSource(options);
    expect(installSourceMock.mock.calls[0][0]).toMatchObject(options);
    expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " info source[@kbn/es Cluster] Installing from source",
    ]
  `);
    // expect(logWriter.messages).toMatchSnapshot();
  });

  test('rejects if installSource() rejects', async () => {
    installSourceMock.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installSource({ sourcePath: 'bar' })).rejects.toThrowError('foo');
  });
});

describe('#installSnapshot()', () => {
  test('awaits installSnapshot() promise and returns { installPath }', async () => {
    let resolveInstallSnapshot: Function;
    installSnapshotMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallSnapshot = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installSnapshot({ version: '8.10.0' });
    await ensureNoResolve(promise);
    resolveInstallSnapshot!();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  test('passes through all options+log to installSnapshot()', async () => {
    installSnapshotMock.mockResolvedValue({ installPath: 'foo' });
    const options: InstallSnapshotOptions = {
      version: '8.10.0',
      license: 'trial',
      password: 'changeme',
      basePath: 'someBasePath',
      installPath: 'someInstallPath',
      esArgs: ['foo=true'],
      useCached: true,
      log,
    };
    const cluster = new Cluster({ log });
    await cluster.installSnapshot(options);
    expect(installSnapshotMock.mock.calls[0][0]).toMatchObject(options);
    expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " info source[@kbn/es Cluster] Installing from snapshot",
    ]
  `);
  });

  test('rejects if installSnapshot() rejects', async () => {
    installSnapshotMock.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installSnapshot({ version: '8.10.0' })).rejects.toThrowError('foo');
  });
});

describe('#installArchive()', () => {
  test('awaits installArchive() promise and returns { installPath }', async () => {
    let resolveInstallArchive: Function;
    installArchiveMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInstallArchive = () => {
            resolve({ installPath: 'foo' });
          };
        })
    );

    const cluster = new Cluster({ log });
    const promise = cluster.installArchive('bar');
    await ensureNoResolve(promise);
    resolveInstallArchive!();
    await expect(ensureResolve(promise)).resolves.toEqual({
      installPath: 'foo',
    });
  });

  test('passes through all options+log to installArchive()', async () => {
    installArchiveMock.mockResolvedValue({ installPath: 'foo' });
    const options: InstallArchiveOptions = {
      license: 'trial',
      password: 'changeme',
      basePath: 'someBasePath',
      installPath: 'someInstallPath',
      esArgs: ['foo=true'],
      log,
    };
    const cluster = new Cluster({ log });
    await cluster.installArchive('bar', options);
    expect(installArchiveMock.mock.calls[0]).toMatchObject(['bar', options]);
    expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " info source[@kbn/es Cluster] Installing from an archive",
    ]
  `);
  });

  test('rejects if installArchive() rejects', async () => {
    installArchiveMock.mockRejectedValue(new Error('foo'));
    const cluster = new Cluster({ log });
    await expect(cluster.installArchive('bar')).rejects.toThrowError('foo');
  });
});

describe('#start(installPath)', () => {
  test('rejects when bin/elasticsearch exists with 0 before starting', async () => {
    mockEsBin({ exitCode: 0, start: false });

    await expect(
      new Cluster({ log }).start(installPath, esClusterExecOptions)
    ).rejects.toThrowError('ES exited without starting');
  });

  test('rejects when bin/elasticsearch exists with 143 before starting', async () => {
    mockEsBin({ exitCode: 143, start: false });

    await expect(
      new Cluster({ log }).start(installPath, esClusterExecOptions)
    ).rejects.toThrowError('ES exited without starting');
  });

  test('rejects when bin/elasticsearch exists with 130 before starting', async () => {
    mockEsBin({ exitCode: 130, start: false });

    await expect(
      new Cluster({ log }).start(installPath, esClusterExecOptions)
    ).rejects.toThrowError('ES exited without starting');
  });

  test('rejects when bin/elasticsearch exists with 1 before starting', async () => {
    mockEsBin({ exitCode: 1, start: false });

    await expect(
      new Cluster({ log }).start(installPath, esClusterExecOptions)
    ).rejects.toThrowError('ES exited with code 1');
  });

  test('resolves when bin/elasticsearch logs "started"', async () => {
    mockEsBin({ start: true });

    await new Cluster({ log }).start(installPath, esClusterExecOptions);
  });

  test('rejects if #start() was called previously', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.start(installPath, esClusterExecOptions);
    await expect(cluster.start(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES has already been started'
    );
  });

  test('rejects if #run() was called previously', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.run(installPath, esClusterExecOptions);
    await expect(cluster.start(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES has already been started'
    );
  });

  test('sets up SSL when enabled', async () => {
    mockEsBin({ start: true, ssl: true });

    const cluster = new Cluster({ log, ssl: true });
    await cluster.start(installPath, esClusterExecOptions);

    const config = extractConfigFilesMock.mock.calls[0][0];
    expect(config).toContain('xpack.security.http.ssl.enabled=true');
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_NOPASSWORD_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
  });

  test(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });
    extractConfigFilesMock.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.start(installPath, esClusterExecOptions);

    expect(extractConfigFilesMock.mock.calls[0][0]).toMatchObject([
      'action.destructive_requires_name=true',
      'cluster.routing.allocation.disk.threshold_enabled=false',
      'ingest.geoip.downloader.enabled=false',
      'search.check_ccs_compatibility=true',
    ]);
  });

  test('allows overriding search.check_ccs_compatibility', async () => {
    mockEsBin({ start: true });
    extractConfigFilesMock.mockReturnValueOnce([]);

    const cluster = new Cluster({
      log,
      ssl: false,
    });
    await cluster.start('undefined', {
      esArgs: ['search.check_ccs_compatibility=false'],
    });

    expect(extractConfigFilesMock.mock.calls[0][0]).toMatchObject([
      'action.destructive_requires_name=true',
      'cluster.routing.allocation.disk.threshold_enabled=false',
      'ingest.geoip.downloader.enabled=false',
      'search.check_ccs_compatibility=false',
    ]);
  });
});

describe('#run()', () => {
  test('resolves when bin/elasticsearch exists with 0', async () => {
    mockEsBin({ exitCode: 0 });

    await new Cluster({ log }).run(installPath, esClusterExecOptions);
  });

  test('resolves when bin/elasticsearch exists with 143', async () => {
    mockEsBin({ exitCode: 143 });

    await new Cluster({ log }).run(installPath, esClusterExecOptions);
  });

  test('resolves when bin/elasticsearch exists with 130', async () => {
    mockEsBin({ exitCode: 130 });

    await new Cluster({ log }).run(installPath, esClusterExecOptions);
  });

  test('rejects when bin/elasticsearch exists with 1', async () => {
    mockEsBin({ exitCode: 1 });

    await expect(new Cluster({ log }).run(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES exited with code 1'
    );
  });

  test('rejects if #start() was called previously', async () => {
    mockEsBin({ exitCode: 0, start: true });

    const cluster = new Cluster({ log });
    await cluster.start(installPath, esClusterExecOptions);
    await expect(cluster.run(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES has already been started'
    );
  });

  test('rejects if #run() was called previously', async () => {
    mockEsBin({ exitCode: 0 });

    const cluster = new Cluster({ log });
    await cluster.run(installPath, esClusterExecOptions);
    await expect(cluster.run(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES has already been started'
    );
  });

  test('sets up SSL when enabled', async () => {
    mockEsBin({ start: true, ssl: true });

    const cluster = new Cluster({ log, ssl: true });
    await cluster.run(installPath, esClusterExecOptions);

    const config = extractConfigFilesMock.mock.calls[0][0];
    expect(config).toContain('xpack.security.http.ssl.enabled=true');
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_NOPASSWORD_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
  });

  test(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });
    extractConfigFilesMock.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.run(installPath, esClusterExecOptions);

    expect(extractConfigFilesMock.mock.calls[0][0]).toMatchObject([
      'action.destructive_requires_name=true',
      'cluster.routing.allocation.disk.threshold_enabled=false',
      'ingest.geoip.downloader.enabled=false',
      'search.check_ccs_compatibility=true',
    ]);
  });

  test('sets default Java heap', async () => {
    mockEsBin({ start: true });

    const cluster = new Cluster({ log });
    await cluster.run(installPath, esClusterExecOptions);

    expect(execaMock.mock.calls[0][2].env.ES_JAVA_OPTS).toMatchInlineSnapshot(
      `"-Xms1536m -Xmx1536m"`
    );
  });

  test('allows Java heap to be overwritten', async () => {
    mockEsBin({ start: true });
    process.env.ES_JAVA_OPTS = '-Xms5g -Xmx5g';

    const cluster = new Cluster({ log });
    await cluster.run(installPath, esClusterExecOptions);

    expect(execaMock.mock.calls[0][2].env.ES_JAVA_OPTS).toMatchInlineSnapshot(`"-Xms5g -Xmx5g"`);
  });
});

describe('#stop()', () => {
  test('rejects if #run() or #start() was not called', async () => {
    const cluster = new Cluster({ log });
    await expect(cluster.stop()).rejects.toThrowError('ES has not been started');
  });

  test('resolves when ES exits with 0', async () => {
    mockEsBin({ exitCode: 0, start: true });

    const cluster = new Cluster({ log });
    await cluster.start(installPath, esClusterExecOptions);
    await cluster.stop();
  });

  test('resolves when ES exits with 143', async () => {
    mockEsBin({ exitCode: 143, start: true });

    const cluster = new Cluster({ log });
    await cluster.start(installPath, esClusterExecOptions);
    await cluster.stop();
  });

  test('resolves when ES exits with 130', async () => {
    mockEsBin({ exitCode: 130, start: true });

    const cluster = new Cluster({ log });
    await cluster.start(installPath, esClusterExecOptions);
    await cluster.stop();
  });

  test('rejects when ES exits with 1', async () => {
    mockEsBin({ exitCode: 1, start: true });

    const cluster = new Cluster({ log });
    await expect(cluster.run(installPath, esClusterExecOptions)).rejects.toThrowError(
      'ES exited with code 1'
    );
    await expect(cluster.stop()).rejects.toThrowError('ES exited with code 1');
  });
});
