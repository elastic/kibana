/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { ToolingLog, ES_P12_PATH, ES_P12_PASSWORD } = require('@kbn/dev-utils');
const execa = require('execa');
const { Cluster } = require('../cluster');
const { installSource, installSnapshot, installArchive } = require('../install');
const { extractConfigFiles } = require('../utils/extract_config_files');

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    require.requireActual('execa')(
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

beforeEach(() => {
  jest.resetAllMocks();
  extractConfigFiles.mockImplementation(config => config);
});

describe('#installSource()', () => {
  it('awaits installSource() promise and returns { installPath }', async () => {
    let resolveInstallSource;
    installSource.mockImplementationOnce(
      () =>
        new Promise(resolve => {
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
    expect(installSource).toHaveBeenCalledTimes(1);
    expect(installSource).toHaveBeenCalledWith({
      log,
      foo: 'bar',
    });
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
        new Promise(resolve => {
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
    expect(installSnapshot).toHaveBeenCalledTimes(1);
    expect(installSnapshot).toHaveBeenCalledWith({
      log,
      foo: 'bar',
    });
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
        new Promise(resolve => {
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
    expect(installArchive).toHaveBeenCalledTimes(1);
    expect(installArchive).toHaveBeenCalledWith('path', {
      log,
      foo: 'bar',
    });
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
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.password=${ES_P12_PASSWORD}`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.path=${ES_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.type=PKCS12`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.password=${ES_P12_PASSWORD}`);
  });

  it(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });

    extractConfigFiles.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.start();

    const config = extractConfigFiles.mock.calls[0][0];
    expect(config).toHaveLength(0);
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
    expect(config).toContain(`xpack.security.http.ssl.keystore.path=${ES_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.type=PKCS12`);
    expect(config).toContain(`xpack.security.http.ssl.keystore.password=${ES_P12_PASSWORD}`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.path=${ES_P12_PATH}`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.type=PKCS12`);
    expect(config).toContain(`xpack.security.http.ssl.truststore.password=${ES_P12_PASSWORD}`);
  });

  it(`doesn't setup SSL when disabled`, async () => {
    mockEsBin({ start: true });

    extractConfigFiles.mockReturnValueOnce([]);

    const cluster = new Cluster({ log, ssl: false });
    await cluster.run();

    const config = extractConfigFiles.mock.calls[0][0];
    expect(config).toHaveLength(0);
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
