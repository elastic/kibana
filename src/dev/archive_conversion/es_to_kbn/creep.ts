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
import { pathExists } from './utils';

const resolveRoot = resolve.bind(null, REPO_ROOT);

type BaseArchivePath = string;

const flatten = (lists): unknown => lists.reduce((a, b) => a.concat(b), []);
const getDirectories = (srcpath): unknown =>
  fs
    .readdirSync(srcpath)
    .map((file) => join(srcpath, file))
    .filter((path) => fs.statSync(path).isDirectory());
const getDirectoriesRecursive = (srcpath): unknown => [
  srcpath,
  ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive)),
];

const creepThru = (log: ToolingLog) => (base: BaseArchivePath) => {
  // const xs = getDirectoriesRecursive(resolveRoot('x-pack/test/functional/es_archives/auditbeat'))
  const xs = getDirectoriesRecursive(resolveRoot(base));
  log.info(`\n### xs: \n\t${xs}`);
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
