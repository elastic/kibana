/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

import chalk from 'chalk';
import simpleGit from 'simple-git/promise';
import { ToolingLog } from '@kbn/dev-utils';

import { installArchive } from './install_archive';
import { log as defaultLog } from '../utils/log';
import { cache } from '../utils/cache';
import { buildSnapshot, archiveForPlatform } from '../utils/build_snapshot';
import { BASE_PATH } from '../paths';

interface InstallSourceOptions {
  sourcePath: string;
  license?: string;
  password?: string;
  basePath?: string;
  installPath?: string;
  log?: ToolingLog;
  esArgs?: string[];
}

/**
 * Installs ES from source
 */
export async function installSource({
  license = 'basic',
  password = 'changeme',
  sourcePath,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, 'source'),
  log = defaultLog,
  esArgs,
}: InstallSourceOptions) {
  log.info('source path: %s', chalk.bold(sourcePath));
  log.info('install path: %s', chalk.bold(installPath));
  log.info('license: %s', chalk.bold(license));

  const metadata = await sourceInfo(sourcePath, license, log);
  const dest = path.resolve(basePath, 'cache', metadata.filename);

  const cacheMeta = cache.readMeta(dest);
  const isCached = cacheMeta.exists && cacheMeta.etag === metadata.etag;
  const archive = isCached ? dest : await buildSnapshot({ sourcePath, log, license });

  if (isCached) {
    log.info('source path unchanged since %s, using cache', chalk.bold(cacheMeta.ts));
  } else {
    cache.writeMeta(dest, metadata);
    fs.copyFileSync(archive, dest);
  }

  return await installArchive(dest, {
    license,
    password,
    basePath,
    installPath,
    log,
    esArgs,
  });
}

async function sourceInfo(cwd: string, license: string, log: ToolingLog = defaultLog) {
  if (!fs.existsSync(cwd)) {
    throw new Error(`${cwd} does not exist`);
  }

  const git = simpleGit(cwd);

  const { task, ext } = archiveForPlatform(os.platform(), license);
  const status = await git.status();
  const branch = status.current;
  const sha = (await git.revparse(['HEAD'])).trim();

  log.info('on %s at %s', chalk.bold(branch), chalk.bold(sha));
  log.info('%s locally modified file(s)', chalk.bold(status.modified.length));

  const etag = crypto.createHash('md5').update(branch);
  etag.update(sha);

  // for changed files, use last modified times in hash calculation
  status.files.forEach((file) => {
    etag.update(fs.statSync(path.join(cwd, file.path)).mtime.toString());
  });

  const cwdHash = crypto.createHash('md5').update(cwd).digest('hex').substr(0, 8);

  const basename = `${branch}-${task}-${cwdHash}`;
  const filename = `${basename}.${ext}`;

  return {
    etag: etag.digest('hex'),
    filename,
    cwd,
    branch,
  };
}
