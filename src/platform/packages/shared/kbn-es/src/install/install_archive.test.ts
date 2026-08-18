/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

import stripAnsi from 'strip-ansi';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { installArchive } from './install_archive';

jest.mock('execa');
const execa = jest.requireMock('execa') as jest.MockedFunction<typeof import('execa')>;

jest.mock('@kbn/dev-utils', () => ({
  extract: jest.fn(),
}));
const { extract } = jest.requireMock('@kbn/dev-utils') as { extract: jest.Mock };

const makeLog = () => {
  const log = new ToolingLog();
  const writer = new ToolingLogCollectingWriter();
  log.setWriters([writer]);
  return { log, writer };
};

const logged = (writer: ToolingLogCollectingWriter, text: string) =>
  writer.messages.some((message) => stripAnsi(message).includes(text));

const keystoreArgs = () =>
  (execa.mock.calls as Array<[string, string[]]>)
    .filter(([bin]) => bin.includes('elasticsearch-keystore'))
    .map(([, args]) => args);

let tmpDir: string;
let installPath: string;
let archivePath: string;

beforeEach(() => {
  jest.clearAllMocks();

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-es-install-test-'));
  installPath = path.join(tmpDir, 'es-install');
  archivePath = path.join(tmpDir, 'fake-es.tar.gz');
  fs.writeFileSync(archivePath, 'fake');

  // Materialize the config dir the real tarball would produce
  extract.mockImplementation(async ({ targetDir }: { targetDir: string }) => {
    fs.mkdirSync(path.join(targetDir, 'config'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'config', 'elasticsearch.yml'), '');
  });
  execa.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('installArchive keystore caching', () => {
  test('fresh install: extracts, bakes keystore into pristine, writes stamp', async () => {
    const { log, writer } = makeLog();
    await installArchive(archivePath, { log, installPath, disableEsTmpDir: true });

    expect(logged(writer, 'extracting')).toBe(true);
    expect(logged(writer, 'reusing install')).toBe(false);

    const ks = keystoreArgs();
    expect(ks.some((a) => a[0] === 'create')).toBe(true);
    expect(ks.some((a) => a[0] === 'add' && a.includes('bootstrap.password'))).toBe(true);

    expect(fs.existsSync(path.join(installPath, '.pristine_config'))).toBe(true);
    expect(fs.existsSync(path.join(installPath, '.kbn_es_install_stamp'))).toBe(true);
  });

  test('reuse, default password, no extra esArgs: skips extraction and keystore entirely', async () => {
    const { log: log1 } = makeLog();
    await installArchive(archivePath, { log: log1, installPath, disableEsTmpDir: true });
    jest.clearAllMocks();

    const { log: log2, writer: writer2 } = makeLog();
    await installArchive(archivePath, { log: log2, installPath, disableEsTmpDir: true });

    expect(logged(writer2, 'reusing install')).toBe(true);
    expect(logged(writer2, 'extracting')).toBe(false);
    expect(keystoreArgs()).toHaveLength(0);
  });

  test('concurrent callers publish one shared install', async () => {
    const { log: log1 } = makeLog();
    const { log: log2 } = makeLog();

    await Promise.all([
      installArchive(archivePath, {
        log: log1,
        installPath,
        configPath: path.join(tmpDir, 'runtime-1'),
        disableEsTmpDir: true,
      }),
      installArchive(archivePath, {
        log: log2,
        installPath,
        configPath: path.join(tmpDir, 'runtime-2'),
        disableEsTmpDir: true,
      }),
    ]);

    expect(extract).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(installPath, '.kbn_es_install_stamp'))).toBe(true);
    expect(fs.existsSync(`${installPath}.lock`)).toBe(false);
  });

  test('reuse, non-default password: skips extraction, adds password to existing keystore', async () => {
    const { log: log1 } = makeLog();
    await installArchive(archivePath, { log: log1, installPath, disableEsTmpDir: true });
    jest.clearAllMocks();

    const { log: log2, writer: writer2 } = makeLog();
    await installArchive(archivePath, {
      log: log2,
      installPath,
      password: 'hunter2',
      disableEsTmpDir: true,
    });

    expect(logged(writer2, 'reusing install')).toBe(true);
    expect(logged(writer2, 'extracting')).toBe(false);
    expect(logged(writer2, 'setting secure setting bootstrap.password')).toBe(true);

    const ks = keystoreArgs();
    expect(ks.some((a) => a[0] === 'create')).toBe(false);
    expect(ks.some((a) => a.includes('--force') && a.includes('bootstrap.password'))).toBe(true);
  });

  test('reuse, extra secure esArg: adds only the extra setting, not bootstrap.password', async () => {
    const { log: log1 } = makeLog();
    await installArchive(archivePath, { log: log1, installPath, disableEsTmpDir: true });
    jest.clearAllMocks();

    const { log: log2, writer: writer2 } = makeLog();
    await installArchive(archivePath, {
      log: log2,
      installPath,
      esArgs: ['telemetry.secret_token=abc123'],
      disableEsTmpDir: true,
    });

    expect(logged(writer2, 'reusing install')).toBe(true);
    expect(logged(writer2, 'extracting')).toBe(false);

    const ks = keystoreArgs();
    expect(ks.some((a) => a[0] === 'create')).toBe(false);
    expect(ks.some((a) => a.includes('--force') && a.includes('telemetry.secret_token'))).toBe(
      true
    );
    expect(ks.some((a) => a.includes('bootstrap.password'))).toBe(false);
  });

  test('fresh install: sweeps stale temp dirs from crashed runs, keeps recent ones', async () => {
    const staleTmp = `${installPath}.tmp-999-0`;
    const recentTmp = `${installPath}.tmp-998-0`;
    fs.mkdirSync(staleTmp, { recursive: true });
    fs.mkdirSync(recentTmp, { recursive: true });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(staleTmp, twoHoursAgo, twoHoursAgo);

    const { log } = makeLog();
    await installArchive(archivePath, { log, installPath, disableEsTmpDir: true });

    expect(fs.existsSync(staleTmp)).toBe(false);
    expect(fs.existsSync(recentTmp)).toBe(true);
  });

  test('stale stamp: re-extracts and re-bakes keystore', async () => {
    const { log: log1 } = makeLog();
    await installArchive(archivePath, { log: log1, installPath, disableEsTmpDir: true });
    jest.clearAllMocks();

    // Invalidate the stamp by changing the archive's mtime
    const stat = fs.statSync(archivePath);
    fs.utimesSync(archivePath, new Date(stat.atimeMs), new Date(stat.mtimeMs + 1000));

    const { log: log2, writer: writer2 } = makeLog();
    await installArchive(archivePath, { log: log2, installPath, disableEsTmpDir: true });

    expect(logged(writer2, 'extracting')).toBe(true);
    expect(logged(writer2, 'reusing install')).toBe(false);

    const ks = keystoreArgs();
    expect(ks.some((a) => a[0] === 'create')).toBe(true);
    expect(ks.some((a) => a[0] === 'add' && a.includes('bootstrap.password'))).toBe(true);
  });

  test('configPath: writes run config there and leaves the install config pristine', async () => {
    const configPath = path.join(tmpDir, 'runtime-config');
    const { log } = makeLog();
    await installArchive(archivePath, { log, installPath, configPath, disableEsTmpDir: true });

    const configFile = (dir: string) =>
      fs.readFileSync(path.join(dir, 'elasticsearch.yml'), 'utf8');
    expect(configFile(configPath)).toContain('xpack.security.enabled: true');
    expect(configFile(path.join(installPath, 'config'))).toBe('');
  });
});
