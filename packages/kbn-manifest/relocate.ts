/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import util from 'util';
import dedent from 'dedent';
import { join } from 'path';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { rename, mkdir, rm } from 'fs/promises';
import { orderBy } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { type Package, getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

const execAsync = util.promisify(exec);
const safeExec = async (command: string, log: ToolingLog) => {
  try {
    const result = await execAsync(command);
    if (result.stderr) {
      log.error(result.stderr);
    }
    return result;
  } catch (err) {
    const message = `Error executing ${command}: ${err}`;
    log.error(message);
    return { stdout: '', stderr: message };
  }
};

const BASE_FOLDER = process.cwd() + '/';
const KIBANA_FOLDER = process.cwd().split('/').pop()!;
const BASE_FOLDER_DEPTH = 5;
const EXCLUDED_MODULES = ['@kbn/core'];
const TARGET_FOLDERS = [
  'src/platform/plugins/',
  'src/platform/packages/',
  'x-pack/platform/plugins/',
  'x-pack/platform/packages/',
  'x-pack/solutions/',
];
const EXTENSIONS = [
  'eslintignore',
  'gitignore',
  'js',
  'txt',
  'json',
  'lock',
  'bazel',
  'md',
  'mdz',
  'asciidoc',
  'ts',
  'jsonc',
  'yaml',
  'yml',
];

const EXCLUDED_FOLDERS = [
  './.chromium',
  './.devcontainer',
  './.es',
  './.git',
  './.github',
  './.native_modules',
  './.node_binaries',
  './.vscode',
  './.yarn-local-mirror',
  './build',
  './core_http.codeql',
  './data',
  './node_modules',
  './target',
  './test.codeql',
  './test2.codeql',
  './trash',
  './trash',
];

const NO_GREP = EXCLUDED_FOLDERS.map((f) => `--exclude-dir "${f}"`).join(' ');

const UPDATED_REFERENCES = new Set<string>();
const UPDATED_RELATIVE_PATHS = new Set<string>();

const calculateModuleTargetFolder = (module: Package): string => {
  const group = module.manifest.group!;
  const isPlugin = module.manifest.type === 'plugin';
  const fullPath = join(BASE_FOLDER, module.directory);
  let moduleDelimiter = isPlugin ? '/plugins/' : '/packages/';
  if (TARGET_FOLDERS.some((folder) => module.directory.includes(folder)) && group === 'platform') {
    // if a module has already been relocated, strip the /private/ or /shared/ part too
    moduleDelimiter += `${module.visibility}/`;
  }
  const moduleFolder = fullPath.split(moduleDelimiter).pop()!;

  if (group === 'platform') {
    const isXpack = fullPath.includes(`/${KIBANA_FOLDER}/x-pack/`);
    const visibility = module.manifest.visibility!;

    return join(
      BASE_FOLDER,
      isXpack ? 'x-pack' : 'src',
      group,
      isPlugin ? 'plugins' : 'packages',
      visibility,
      moduleFolder
    );
  } else {
    return join(
      BASE_FOLDER,
      'x-pack', // all solution modules are 'x-pack'
      'solutions',
      group,
      isPlugin ? 'plugins' : 'packages',
      moduleFolder
    );
  }
};

const belongsTo = (module: Package, owner: string): boolean => {
  return Array.from(module.manifest.owner)[0] === owner;
};

const stripFirstChunk = (path: string): string => {
  const chunks = path.split('/');
  chunks.shift();
  return chunks.join('/');
};

const replaceReferences = async (module: Package, destination: string, log: ToolingLog) => {
  const source = module.directory.startsWith('/Users')
    ? module.directory
    : join(BASE_FOLDER, module.directory);
  const relativeSource = source.replace(BASE_FOLDER, '');
  const relativeDestination = destination.replace(BASE_FOLDER, '');

  await replaceReferencesInternal(relativeSource, relativeDestination, log);
  if (
    (relativeSource.startsWith('src') && relativeDestination.startsWith('src')) ||
    (relativeSource.startsWith('x-pack') && relativeDestination.startsWith('x-pack'))
  ) {
    await replaceReferencesInternal(
      stripFirstChunk(relativeSource),
      stripFirstChunk(relativeDestination),
      log
    );
  }
};

const replaceReferencesInternal = async (
  relativeSource: string,
  relativeDestination: string,
  log: ToolingLog
) => {
  log.info(`Finding and replacing "${relativeSource}" by "${relativeDestination}"`);

  const src = relativeSource.replaceAll('/', '\\/');
  const dst = relativeDestination.replaceAll('/', '\\/');

  const result = await safeExec(
    `grep -I -s -R -l ${EXTENSIONS.map((ext) => `--include="*.${ext}"`).join(' ')} \
    ${NO_GREP} --exclude-dir "./node_modules" "${relativeSource}"`,
    log
  );

  const matchingFiles = result.stdout.split('\n').filter(Boolean);

  for (let i = 0; i < matchingFiles.length; ++i) {
    const file = matchingFiles[i];

    const md5Before = (await safeExec(`md5 ${file} --quiet`, log)).stdout.trim();
    // if we are updating packages/cloud references, we must pay attention to not update packages/cloud_defend too
    await safeExec(`sed -i '' -E "/${src}[\-_a-zA-Z0-9]/! s/${src}/${dst}/g" ${file}`, log);
    const md5After = (await safeExec(`md5 ${file} --quiet`, log)).stdout.trim();

    if (md5Before !== md5After) {
      UPDATED_REFERENCES.add(file);
    }
  }
};

const getRelativeDepth = (directory: string): number => {
  const fullPath = directory.startsWith(BASE_FOLDER) ? directory : join(BASE_FOLDER, directory);
  return fullPath.split('/').length - BASE_FOLDER_DEPTH;
};

const replaceRelativePaths = async (module: Package, destination: string, log: ToolingLog) => {
  log.info('Updating relative paths at fault');

  const relativeDepthBefore = getRelativeDepth(module.directory);
  const relativeDepthAfter = getRelativeDepth(destination);
  const relativeDepthDiff = relativeDepthAfter - relativeDepthBefore;

  const result = await safeExec(
    `grep -I -s -R -n -o ${NO_GREP} -E "\\.\\.(/\\.\\.)+/?" ${destination}`,
    log
  );
  const matches = result.stdout.split('\n').filter(Boolean);

  const brokenReferences = orderBy(
    matches
      .map((line) => line.split(':'))
      .map(([path, line, match]) => {
        if (match.endsWith('/')) {
          match = match.substring(0, match.length - 1);
        }
        let moduleRelativePath = path.replace(destination, '');
        if (moduleRelativePath.startsWith('/')) {
          moduleRelativePath = moduleRelativePath.substring(1);
        }
        const moduleRelativeDepth = moduleRelativePath.split('/').length - 1; // do not count filename
        const matchDepth = match.split('/').length;

        return { path, line, moduleRelativeDepth, match, matchDepth };
      })
      .filter(({ matchDepth, moduleRelativeDepth }) => matchDepth > moduleRelativeDepth),
    'matchDepth',
    'desc'
  );

  for (let i = 0; i < brokenReferences.length; ++i) {
    const { path, line, match, matchDepth } = brokenReferences[i];
    const pathLine = `${path}:${line}`;

    if (UPDATED_RELATIVE_PATHS.has(pathLine)) {
      log.error(
        `Cannot replace multiple occurrences of "${match}" in the same line, please fix manually:\t${pathLine}`
      );
    } else {
      const escapedMatch = match.replaceAll('/', '\\/').replaceAll('.', '\\.'); // escape '.' too (regexp any char)
      const escapedReplacement = new Array(matchDepth + relativeDepthDiff).fill('..').join('\\/');

      await safeExec(`sed -i '' "${line}s/${escapedMatch}/${escapedReplacement}/" ${path}`, log);
      UPDATED_RELATIVE_PATHS.add(pathLine);
    }
  }
};

const relocateModule = async (module: Package, log: ToolingLog) => {
  const destination = calculateModuleTargetFolder(module);
  log.info(`Moving ${module.directory} to ${destination}`);
  const chunks = destination.split('/');
  chunks.pop(); // discard module folder
  if (existsSync(destination)) {
    await rm(destination, { recursive: true });
  }
  await mkdir(join('/', ...chunks), { recursive: true });
  await rename(module.directory, destination);
  await replaceReferences(module, destination, log);
  await replaceRelativePaths(module, destination, log);
};

export const playground = (modules: Package[], log: ToolingLog) => {
  // modules.forEach((module) => log.info(`${module.id}: ${module.directory}`));
  const teams = new Set<string>(
    modules.flatMap((module) =>
      Array.isArray(module.manifest?.owner) ? module.manifest?.owner : [module.manifest?.owner]
    )
  );
  log.info('TEAMS', teams);
};

export const showRelocatePlan = (modules: Package[], log: ToolingLog) => {
  const plugins = modules.filter((module) => module.manifest.type === 'plugin');
  const packages = modules.filter((module) => module.manifest.type !== 'plugin');

  const target = (module: Package) => calculateModuleTargetFolder(module).replace(BASE_FOLDER, '');

  log.info(dedent`${plugins.length} plugin(s) are going to be relocated:\n
    | Id | Target folder |
    | -- | ------------- |
    ${plugins.map((plg) => `| \`${plg.id}\` | \`${target(plg)}\` |`).join('\n')}
  `);

  log.info(dedent`${packages.length} package(s) are going to be relocated:\n
    | Id | Target folder |
    | -- | ------------- |
    ${packages.map((pkg) => `| \`${pkg.id}\` | \`${target(pkg)}\` |`).join('\n')}
  `);
};

export const showRelocateSummary = (log: ToolingLog) => {
  if (UPDATED_REFERENCES.size > 0) {
    log.info('\n\nThe following files have been updated to replace references to modules:');
    UPDATED_REFERENCES.forEach((ref) => log.info(ref));
  }

  if (UPDATED_RELATIVE_PATHS.size > 0) {
    log.info('\n\nThe following files contain relative paths that have been updated:');
    UPDATED_RELATIVE_PATHS.forEach((ref) => log.info(ref));
  }
};

export const relocateModules = async (owner: string, log: ToolingLog) => {
  const modules = getPackages(REPO_ROOT);

  const toMove = modules.filter(
    (module) =>
      belongsTo(module, owner) &&
      module.manifest.group &&
      !module.manifest.devOnly &&
      !EXCLUDED_MODULES.includes(module.id) &&
      !module.id.startsWith('@kbn/core-') &&
      !module.directory.includes(`/${KIBANA_FOLDER}/test/`) &&
      !module.directory.includes(`/${KIBANA_FOLDER}/x-pack/test/`)
  );

  // return playground(toMove, log);
  showRelocatePlan(toMove, log);

  for (let i = 0; i < toMove.length; ++i) {
    const module = toMove[i];

    if (TARGET_FOLDERS.some((folder) => module.directory.includes(folder))) {
      // skip modules that are already moved
      continue;
    }
    log.info('\n--------------------------------------------------------------------------------');
    log.info(`\t${module.id} (${i + 1} of ${toMove.length})`);
    log.info('--------------------------------------------------------------------------------');
    await relocateModule(module, log);
  }

  showRelocateSummary(log);

  // after move operations
  await safeExec('yarn kbn bootstrap', log);
  await safeExec('node scripts/build_plugin_list_docs', log);
  await safeExec('node scripts/generate codeowners', log);
  await safeExec('node scripts/lint_packages --fix', log);
  await safeExec('node scripts/telemetry_check --fix', log);
  await safeExec('node scripts/eslint --fix', log);
  await safeExec('node scripts/precommit_hook --fix', log);
};
