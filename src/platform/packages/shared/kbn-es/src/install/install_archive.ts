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

import chalk from 'chalk';
import execa from 'execa';
import del from 'del';
import { extract } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';

import { BASE_PATH, ES_CONFIG_DIRNAME, ES_CONFIG_FILENAME, ES_KEYSTORE_BIN } from '../paths';
import { Artifact } from '../artifact';
import { parseSettings, SettingsFilter } from '../settings';
import { log as defaultLog, isFile, copyFileSync } from '../utils';
import type { InstallArchiveOptions } from './types';

const isHttpUrl = (str: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(str).protocol);
  } catch {
    return false;
  }
};

/** Copy of `config/` as extracted, restored before each run writes its own settings */
const PRISTINE_CONFIG_DIRNAME = '.pristine_config';

/** Identifies the archive an install came from; reuse requires an exact match */
const INSTALL_STAMP_FILENAME = '.kbn_es_install_stamp';

/** Bump when the layout written below changes, so existing installs are re-extracted */
const INSTALL_FORMAT_VERSION = 1;

/** Any other password costs a keystore write on top of the baked-in one */
const BAKED_BOOTSTRAP_PASSWORD = 'changeme';

const INSTALL_LOCK_RETRY_MS = 100;
const INSTALL_LOCK_MAX_AGE_MS = 60 * 60 * 1000;

let tmpInstallId = 0;
let installLockId = 0;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
};

const getInstallLockState = (lockPath: string): 'active' | 'stale' | 'missing' => {
  let mtimeMs: number;
  try {
    ({ mtimeMs } = fs.statSync(lockPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }
    return 'active';
  }

  try {
    const { pid } = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return typeof pid === 'number' && !isProcessAlive(pid) ? 'stale' : 'active';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }
    return Date.now() - mtimeMs > INSTALL_LOCK_MAX_AGE_MS ? 'stale' : 'active';
  }
};

const acquireInstallLock = async (installPath: string, log: ToolingLog) => {
  const lockPath = `${installPath}.lock`;
  const owner = JSON.stringify({ pid: process.pid, id: installLockId++ });
  let waiting = false;

  fs.mkdirSync(path.dirname(installPath), { recursive: true });

  while (true) {
    try {
      fs.writeFileSync(lockPath, owner, { flag: 'wx' });
      return () => {
        try {
          if (fs.readFileSync(lockPath, 'utf8') === owner) {
            fs.rmSync(lockPath);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    const lockState = getInstallLockState(lockPath);
    if (lockState === 'missing') {
      continue;
    }
    if (lockState === 'stale') {
      fs.rmSync(lockPath, { force: true });
      continue;
    }

    if (!waiting) {
      log.info('waiting for another process to install at %s', chalk.bold(installPath));
      waiting = true;
    }
    await delay(INSTALL_LOCK_RETRY_MS);
  }
};

const removeStaleTmpInstalls = async (installPath: string) => {
  const parent = path.dirname(installPath);
  const prefix = `${path.basename(installPath)}.tmp-`;
  // recent temp dirs may belong to an install still in progress
  const staleBefore = Date.now() - 60 * 60 * 1000;

  let entries: string[];
  try {
    entries = fs.readdirSync(parent);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.startsWith(prefix)) {
      continue;
    }

    const tmpPath = path.resolve(parent, entry);
    try {
      if (fs.statSync(tmpPath).mtimeMs < staleBefore) {
        await del(tmpPath, { force: true });
      }
    } catch {
      // may have been removed by a concurrent run
    }
  }
};

const getArchiveStamp = (archivePath: string) => {
  const { size, mtimeMs } = fs.statSync(archivePath);
  return JSON.stringify({
    format: INSTALL_FORMAT_VERSION,
    archive: path.basename(archivePath),
    size,
    mtimeMs,
  });
};

const readInstallStamp = (stampPath: string) => {
  try {
    return fs.readFileSync(stampPath, 'utf8');
  } catch {
    return undefined;
  }
};

/**
 * Extracts an ES archive and optionally installs plugins
 */
export async function installArchive(archive: string, options?: InstallArchiveOptions) {
  const {
    license = 'basic',
    password = 'changeme',
    basePath = BASE_PATH,
    installPath = path.resolve(basePath, path.basename(archive, '.tar.gz')),
    log = defaultLog,
    esArgs = [],
    disableEsTmpDir = process.env.FTR_DISABLE_ES_TMPDIR?.toLowerCase() === 'true',
    resources,
    configPath,
  } = options || {};

  let dest = archive;
  if (isHttpUrl(archive)) {
    const artifact = await Artifact.getArchive(archive, log);
    dest = path.resolve(basePath, 'cache', artifact.spec.filename);
    await artifact.download(dest);
  }

  const pristineConfigPath = path.resolve(installPath, PRISTINE_CONFIG_DIRNAME);
  const stampPath = path.resolve(installPath, INSTALL_STAMP_FILENAME);
  const stamp = getArchiveStamp(dest);
  const canReuseInstall = () =>
    readInstallStamp(stampPath) === stamp && fs.existsSync(pristineConfigPath);

  if (canReuseInstall()) {
    log.info('reusing install at %s', chalk.bold(installPath));
  } else {
    const releaseInstallLock = await acquireInstallLock(installPath, log);
    try {
      if (canReuseInstall()) {
        log.info('reusing install at %s', chalk.bold(installPath));
      } else {
        const tmpInstallPath = `${installPath}.tmp-${process.pid}-${tmpInstallId++}`;
        await del(tmpInstallPath, { force: true });
        await removeStaleTmpInstalls(installPath);

        log.info('extracting %s', chalk.bold(dest));
        await extract({
          archivePath: dest,
          targetDir: tmpInstallPath,
          stripComponents: 1,
        });

        const tmpConfigPath = path.resolve(tmpInstallPath, ES_CONFIG_DIRNAME);
        await createKeystore(tmpInstallPath, tmpConfigPath, log, [
          ['bootstrap.password', BAKED_BOOTSTRAP_PASSWORD],
        ]);
        fs.cpSync(tmpConfigPath, path.resolve(tmpInstallPath, PRISTINE_CONFIG_DIRNAME), {
          recursive: true,
        });
        fs.writeFileSync(path.resolve(tmpInstallPath, INSTALL_STAMP_FILENAME), stamp, 'utf8');

        if (fs.existsSync(installPath)) {
          log.info('install directory already exists, removing');
          fs.rmSync(stampPath, { force: true });
          await del(installPath, { force: true });
        }

        fs.renameSync(tmpInstallPath, installPath);
        log.info('extracted to %s', chalk.bold(installPath));
      }
    } finally {
      releaseInstallLock();
    }
  }

  const esConfigPath = configPath ?? path.resolve(installPath, ES_CONFIG_DIRNAME);
  await del(esConfigPath, { force: true });
  fs.cpSync(pristineConfigPath, esConfigPath, { recursive: true });

  if (configPath) {
    log.info('using %s as ES_PATH_CONF', chalk.bold(configPath));
  } else {
    // Drop run state a fresh extract wouldn't have had
    await del(
      ['data', 'logs', 'ES_TMPDIR', 'plugins'].map((p) => path.resolve(installPath, p)),
      { force: true }
    );
    fs.mkdirSync(path.resolve(installPath, 'plugins'));
  }

  /**
   * If we're running inside a Vagrant VM, and this is running in a synced folder,
   * ES will fail to start due to ML being unable to write a pipe in the synced folder.
   * Disabling allows ES to write to the OS's /tmp directory.
   *
   * Skipped when `configPath` is set: those callers pass their own `esTmpDir`.
   */
  if (!disableEsTmpDir && !configPath) {
    const tmpdir = path.resolve(installPath, 'ES_TMPDIR');
    fs.mkdirSync(tmpdir, { recursive: true });
    log.info('created %s', chalk.bold(tmpdir));
  }

  // starting in 6.3, security is disabled by default. Since we bootstrap
  // the keystore, we can enable security ourselves.
  await appendToConfig(esConfigPath, 'xpack.security.enabled', 'true');

  await appendToConfig(esConfigPath, 'xpack.license.self_generated.type', license);

  const keystoreOverrides = parseSettings(esArgs, { filter: SettingsFilter.SecureOnly });
  if (password !== BAKED_BOOTSTRAP_PASSWORD) {
    keystoreOverrides.unshift(['bootstrap.password', password]);
  }
  if (keystoreOverrides.length) {
    await addKeystoreSettings(installPath, esConfigPath, log, keystoreOverrides);
  }

  // copy resources to ES config directory
  if (resources) {
    resources.forEach((resource) => {
      if (!isFile(resource)) {
        throw new Error(
          `Invalid resource: '${resource}'.\nOnly valid files can be copied to ES config directory`
        );
      }

      const filename = path.basename(resource);
      const destPath = path.resolve(esConfigPath, filename);

      copyFileSync(resource, destPath);
      log.info('moved %s in config to %s', resource, destPath);
    });
  }

  return { installPath, disableEsTmpDir, configPath };
}

/**
 * Appends single line to elasticsearch.yml config file
 */
async function appendToConfig(esConfigPath: string, key: string, value: string) {
  fs.appendFileSync(path.resolve(esConfigPath, ES_CONFIG_FILENAME), `${key}: ${value}\n`, 'utf8');
}

const keystoreEnv = (esConfigPath: string) => ({ JAVA_HOME: '', ES_PATH_CONF: esConfigPath });

async function addKeystoreSettings(
  installPath: string,
  esConfigPath: string,
  log: ToolingLog,
  settings: Array<[string, string]>
) {
  for (const [secureSettingName, secureSettingValue] of settings) {
    log.info(
      `setting secure setting %s to %s`,
      chalk.bold(secureSettingName),
      chalk.bold(secureSettingValue)
    );
    await execa(ES_KEYSTORE_BIN, ['add', '--force', secureSettingName, '-x'], {
      input: secureSettingValue,
      cwd: installPath,
      env: keystoreEnv(esConfigPath),
    });
  }
}

async function createKeystore(
  installPath: string,
  esConfigPath: string,
  log: ToolingLog,
  settings: Array<[string, string]>
) {
  await execa(ES_KEYSTORE_BIN, ['create'], {
    cwd: installPath,
    env: keystoreEnv(esConfigPath),
  });
  await addKeystoreSettings(installPath, esConfigPath, log, settings);
}
