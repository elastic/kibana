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

import { existsSync, lstatSync, readFileSync, readlinkSync } from 'fs';
import globby from 'globby';
import { dirname } from 'path';

import { run, createFailError } from '@kbn/dev-utils';

import { REPO_ROOT } from './constants';
import { File } from './file';
import { matchesAnyGlob } from './globs';

const LOCKFILE_GLOBS = ['**/yarn.lock'];
const MANIFEST_GLOBS = ['**/package.json'];
const IGNORE_FILE_GLOBS = [
  // tests aren't used in production, ignore them
  '**/test/**/*',
  // fixtures aren't used in production, ignore them
  '**/*fixtures*/**/*',
  // cypress isn't used in production, ignore it
  'x-pack/plugins/apm/e2e/*',
  // apm scripts aren't used in production, ignore them
  'x-pack/plugins/apm/scripts/*',
];

run(async ({ log }) => {
  const paths = await globby(LOCKFILE_GLOBS.concat(MANIFEST_GLOBS), {
    cwd: REPO_ROOT,
    nodir: true,
    gitignore: true,
    ignore: [
      // the gitignore: true option makes sure that we don't
      // include files from node_modules in the result, but it still
      // loads all of the files from node_modules before filtering
      // so it's still super slow. This prevents loading the files
      // and still relies on gitignore to to final ignores
      '**/node_modules',
    ],
  });

  const files = paths.map((path) => new File(path));

  await checkLockfileSymlinks(log, files);
});

async function checkLockfileSymlinks(log, files) {
  const filtered = files.filter(
    (file) => !matchesAnyGlob(file.getRelativePath(), IGNORE_FILE_GLOBS)
  );
  await checkOnlyLockfileAtProjectRoot(filtered);
  await checkSuperfluousSymlinks(log, filtered);
  await checkMissingSymlinks(log, filtered);
  await checkIncorrectSymlinks(log, filtered);
}

async function checkOnlyLockfileAtProjectRoot(files) {
  const errorPaths = [];

  files
    .filter((file) => matchesAnyGlob(file.getRelativePath(), LOCKFILE_GLOBS))
    .forEach((file) => {
      const path = file.getRelativePath();
      const parent = dirname(path);
      const stats = lstatSync(path);
      if (!stats.isSymbolicLink() && parent !== '.') {
        errorPaths.push(path);
      }
    });

  if (errorPaths.length) {
    throw createFailError(
      `These directories MUST NOT have a 'yarn.lock' file:\n${listPaths(errorPaths)}`
    );
  }
}

async function checkSuperfluousSymlinks(log, files) {
  const errorPaths = [];

  files
    .filter((file) => matchesAnyGlob(file.getRelativePath(), LOCKFILE_GLOBS))
    .forEach((file) => {
      const path = file.getRelativePath();
      const parent = dirname(path);
      const stats = lstatSync(path);
      if (!stats.isSymbolicLink()) {
        return;
      }

      const manifestPath = `${parent}/package.json`;
      if (!existsSync(manifestPath)) {
        log.warning(
          `No manifest found at '${manifestPath}', but found an adjacent 'yarn.lock' symlink.`
        );
        errorPaths.push(path);
        return;
      }

      try {
        const manifest = readFileSync(manifestPath);
        try {
          const json = JSON.parse(manifest);
          if (!json.dependencies || !Object.keys(json.dependencies).length) {
            log.warning(
              `Manifest at '${manifestPath}' has an adjacent 'yarn.lock' symlink, but manifest has no dependencies.`
            );
            errorPaths.push(path);
          }
        } catch (err) {
          log.warning(
            `Manifest at '${manifestPath}' has an adjacent 'yarn.lock' symlink, but could not parse manifest JSON (${err.message}).`
          );
          errorPaths.push(path);
        }
      } catch (err) {
        log.warning(
          `Manifest at '${manifestPath}', has an adjacent 'yarn.lock' symlink, but could not read manifest (${err.message}).`
        );
        errorPaths.push(path);
      }
    });

  if (errorPaths.length) {
    throw createFailError(
      `These directories MUST NOT have a 'yarn.lock' symlink:\n${listPaths(errorPaths)}`
    );
  }
}

async function checkMissingSymlinks(log, files) {
  const errorPaths = [];

  files
    .filter((file) => matchesAnyGlob(file.getRelativePath(), MANIFEST_GLOBS))
    .forEach((file) => {
      const path = file.getRelativePath();
      const parent = dirname(path);
      const lockfilePath = `${parent}/yarn.lock`;
      if (existsSync(lockfilePath)) {
        return;
      }

      try {
        const manifest = readFileSync(path);
        try {
          const json = JSON.parse(manifest);
          if (json.dependencies && Object.keys(json.dependencies).length) {
            const correctSymlink = getCorrectSymlink(lockfilePath);
            log.warning(
              `Manifest at '${path}' has dependencies, but did not find an adjacent 'yarn.lock' symlink to '${correctSymlink}'.`
            );
            errorPaths.push(`${parent}/yarn.lock`);
          }
        } catch (err) {
          log.warning(`Could not parse manifest JSON at '${path}' (${err.message}).`);
        }
      } catch (err) {
        log.warning(`Could not read manifest at '${path}' (${err.message}).`);
      }
    });

  if (errorPaths.length) {
    throw createFailError(
      `These directories MUST have a 'yarn.lock' symlink:\n${listPaths(errorPaths)}`
    );
  }
}

async function checkIncorrectSymlinks(log, files) {
  const errorPaths = [];

  files
    .filter((file) => matchesAnyGlob(file.getRelativePath(), LOCKFILE_GLOBS))
    .forEach((file) => {
      const path = file.getRelativePath();
      const stats = lstatSync(path);
      if (!stats.isSymbolicLink()) {
        return;
      }

      const symlink = readlinkSync(path);
      const correctSymlink = getCorrectSymlink(path);
      if (symlink !== correctSymlink) {
        log.warning(
          `Symlink at '${path}' points to '${symlink}', but it should point to '${correctSymlink}'.`
        );
        errorPaths.push(path);
      }
    });

  if (errorPaths.length) {
    throw createFailError(
      `These symlinks do NOT point to the 'yarn.lock' file in the project root:\n${listPaths(
        errorPaths
      )}`
    );
  }
}

function getCorrectSymlink(path) {
  const count = path.split('/').length - 1;
  return `${'../'.repeat(count)}yarn.lock`;
}

function listPaths(paths) {
  return paths.map((path) => ` - ${path}`).join('\n');
}
