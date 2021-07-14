/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import fs from 'fs';
import { resolve, join } from 'path';
import { EsArchiver } from '@kbn/es-archiver';
import { spawnSync } from 'child_process';
import shell from 'shelljs';
import { acMark, flatten, pathExists, tail } from './utils';

const resolveRoot = resolve.bind(null, REPO_ROOT);

type BaseArchivePath = string;

const getDirectories = (srcpath): unknown =>
  fs
    .readdirSync(srcpath)
    .map((file) => join(srcpath, file))
    .filter((path) => fs.statSync(path).isDirectory());
const getDirectoriesRecursive = (srcpath): unknown => [
  srcpath,
  ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive)),
];

const prokSync = (script) => (opts) => {
  const merged = [script, ...opts];
  spawnSync(process.execPath, merged);
};
const esArchiver = resolveRoot('scripts/es_archiver.js');
const kbnArchiver = resolveRoot('scripts/kbn_archiver.js');

const esArchiverScript = prokSync(esArchiver);
const kbnArchiverScript = prokSync(kbnArchiver);

const xpackConfig = resolveRoot('x-pack/test/functional/config.js');
const kbnArchiveFixturesDir = resolveRoot('x-pack/test/functional/fixtures/kbn_archiver');

const computeName = (fixtureDir: string) => (esArchiveName: string) => {
  return `${fixtureDir}/${esArchiveName}_NOT_COMPUTED_YET`;
};

const join2Str = (xs: string[]) => xs.join(',');
const soTypes = ['index-pattern', 'lens', 'canvas-workpad'];

const loadAndSave = (log: ToolingLog) => (name: string) => {
  log.info(`${acMark} processing: \n\t[${name}]`);

  const computed = computeName(kbnArchiveFixturesDir)(name);

  try {
    esArchiverScript(['--config', xpackConfig, 'load', name]);
    log.info(`${acMark} creating: \n\t${computed}`);
    shell.mkdir('-p', computed);
    kbnArchiverScript(['--config', xpackConfig, 'save', computed, '--type', join2Str(soTypes)]);
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

const creepFs = (archiveRoot: BaseArchivePath) => (log: ToolingLog) => {
  // archiveRoot = 'fake'
  log.info('Creeping through', archiveRoot);

  const logNotFound = log.error.bind(log, `Not found: [${archiveRoot}]`);

  const creepWithLog = creepThru(log);
  pathExists(archiveRoot).fold(logNotFound, creepWithLog);
};
export const creep = (base: string): ((log: ToolingLog) => void) => (log) =>
  creepFs(resolveRoot(base))(log);
