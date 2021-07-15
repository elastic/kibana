/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { resolve } from 'path';
import { spawnSync } from 'child_process';
import shell from 'shelljs';
import { acMark, pathExists, tail, join2Str, computeName } from './utils';
import { getDirectoriesRecursive } from './recurse_directories';

const resolveRoot = resolve.bind(null, REPO_ROOT);

type BaseArchivePath = string;

const prokSync = (script: string) => (opts: string[]) =>
  spawnSync(process.execPath, [script, ...opts]);

const esArchiver = resolveRoot('scripts/es_archiver.js');
const kbnArchiver = resolveRoot('scripts/kbn_archiver.js');

const esArchiverScript = prokSync(esArchiver);
const kbnArchiverScript = prokSync(kbnArchiver);

const xpackConfig = resolveRoot('x-pack/test/functional/config.js');
const kbnArchiveFixturesDir = resolveRoot('x-pack/test/functional/fixtures/kbn_archiver');

const computeKbnArchiveName = computeName(kbnArchiveFixturesDir);

const joinedSoTypes =
  process.env.SO_TYPES ||
  join2Str(['dashboard', 'visualization', 'index-pattern', 'lens', 'canvas-workpad']);

const loadAndSave = (log: ToolingLog) => (esArchiveName: string) => {
  log.info(`${acMark} processing: \n\t[${esArchiveName}]`);

  const computed = computeKbnArchiveName(esArchiveName);

  try {
    esArchiverScript(['--config', xpackConfig, 'load', esArchiveName]);
    log.info(`${acMark} creating: \n\t${computed}`);
    shell.mkdir('-p', computed);
    kbnArchiverScript(['--config', xpackConfig, 'save', computed, '--type', joinedSoTypes]);
  } catch (err) {
    log.error(`${acMark} ${err}`);
  }
};

const creepThru = (log: ToolingLog) => (base: BaseArchivePath) => {
  const loadWithLog = loadAndSave(log);
  for (const dir of tail(getDirectoriesRecursive(resolveRoot(base)))) {
    if (!dir.includes('empty_kibana')) loadWithLog(dir);
  }
};

const validate = (archiveRoot: BaseArchivePath) => (log: ToolingLog) => {
  // archiveRoot = 'fake'
  log.info('Creeping through', archiveRoot);

  const logNotFound = log.error.bind(log, `${acMark} Not found: [${archiveRoot}]`);

  const creepWithLog = creepThru(log);
  pathExists(archiveRoot).fold(logNotFound, creepWithLog);
};
export const prok = (base: string): ((log: ToolingLog) => void) => (log) =>
  validate(resolveRoot(base))(log);
