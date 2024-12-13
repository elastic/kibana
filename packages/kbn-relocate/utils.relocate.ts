/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { orderBy } from 'lodash';
import type { Package } from './types';
import { applyTransforms } from './transforms';
import {
  BASE_FOLDER,
  BASE_FOLDER_DEPTH,
  EXTENSIONS,
  KIBANA_FOLDER,
  NO_GREP,
  SCRIPT_ERRORS,
  TARGET_FOLDERS,
  UPDATED_REFERENCES,
  UPDATED_RELATIVE_PATHS,
} from './constants';
import { quietExec, safeExec } from './utils.exec';

export const belongsTo = (module: Package, owner: string): boolean => {
  return Array.from(module.manifest.owner)[0] === owner;
};

export const stripFirstChunk = (path: string): string => {
  const chunks = path.split('/');
  chunks.shift();
  return chunks.join('/');
};

export const calculateModuleTargetFolder = (module: Package): string => {
  const group = module.manifest.group!;
  const isPlugin = module.manifest.type === 'plugin';
  const fullPath = join(BASE_FOLDER, module.directory);
  let moduleDelimiter = isPlugin ? '/plugins/' : '/packages/';
  if (TARGET_FOLDERS.some((folder) => module.directory.includes(folder)) && group === 'platform') {
    // if a platform module has already been relocated, strip the /private/ or /shared/ part too
    moduleDelimiter += `${module.visibility}/`;
  }
  const moduleFolder = fullPath.split(moduleDelimiter).pop()!;
  let path: string;

  if (group === 'platform') {
    if (fullPath.includes(`/${KIBANA_FOLDER}/packages/core/`)) {
      // packages/core/* => src/core/packages/*
      path = join(BASE_FOLDER, 'src', 'core', 'packages', moduleFolder);
    } else {
      const isXpack = fullPath.includes(`/${KIBANA_FOLDER}/x-pack/`);
      const visibility = module.manifest.visibility!;

      path = join(
        BASE_FOLDER,
        isXpack ? 'x-pack' : 'src',
        group,
        isPlugin ? 'plugins' : 'packages',
        visibility,
        moduleFolder
      );
    }
  } else {
    path = join(
      BASE_FOLDER,
      'x-pack', // all solution modules are 'x-pack'
      'solutions',
      group,
      isPlugin ? 'plugins' : 'packages',
      moduleFolder
    );
  }

  // after-creation transforms
  return applyTransforms(module, path);
};

export const replaceReferences = async (module: Package, destination: string, log: ToolingLog) => {
  const dir = module.directory;
  const source =
    dir.startsWith(KIBANA_FOLDER) || dir.startsWith(`/${KIBANA_FOLDER}`)
      ? join(BASE_FOLDER, dir)
      : dir;
  const relativeSource = source.replace(BASE_FOLDER, '');
  const relativeDestination = destination.replace(BASE_FOLDER, '');

  if (
    (relativeSource.startsWith('src') && relativeDestination.startsWith('src')) ||
    (relativeSource.startsWith('x-pack') && relativeDestination.startsWith('x-pack'))
  ) {
    await replaceReferencesInternal(
      stripFirstChunk(relativeSource),
      stripFirstChunk(relativeDestination),
      log
    );
  } else {
    await replaceReferencesInternal(relativeSource, relativeDestination, log);
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
    ${NO_GREP} "${relativeSource}"`,
    false
  );

  const matchingFiles = result.stdout.split('\n').filter(Boolean);

  for (let i = 0; i < matchingFiles.length; ++i) {
    const file = matchingFiles[i];
    if (file.includes('/target/types/') || file.includes('/target/public/')) {
      continue;
    }

    const md5Before = (await quietExec(`md5 ${file} --quiet`)).stdout.trim();
    // if we are updating packages/cloud references, we must pay attention to not update packages/cloud_defend too
    await safeExec(`sed -i '' -E "/${src}[\-_a-zA-Z0-9]/! s/${src}/${dst}/g" ${file}`, false);
    const md5After = (await quietExec(`md5 ${file} --quiet`)).stdout.trim();

    if (md5Before !== md5After) {
      UPDATED_REFERENCES.add(file);
    }
  }

  // plugins\/pluginName special treatment (.buildkite/scripts/pipelines/pull_request/pipeline.ts)
  const backFwdSrc = relativeSource.replaceAll('/', `\\\\\\/`);
  const backFwdDst = relativeDestination.replaceAll('/', `\\\\\\/`);
  await safeExec(
    `sed -i '' -E '/${src}[\-_a-zA-Z0-9]/! s/${backFwdSrc}/${backFwdDst}/g' .buildkite/scripts/pipelines/pull_request/pipeline.ts`,
    false
  );
};

const getRelativeDepth = (directory: string): number => {
  const fullPath = directory.startsWith(BASE_FOLDER) ? directory : join(BASE_FOLDER, directory);
  return fullPath.split('/').length - BASE_FOLDER_DEPTH;
};

export const replaceRelativePaths = async (
  module: Package,
  destination: string,
  log: ToolingLog
) => {
  log.info('Updating relative paths at fault');

  const relativeDepthBefore = getRelativeDepth(module.directory);
  const relativeDepthAfter = getRelativeDepth(destination);
  const relativeDepthDiff = relativeDepthAfter - relativeDepthBefore;

  const result = await safeExec(
    `grep -I -s -R -n -o ${NO_GREP} -E "\\.\\.(/\\.\\.)+/?" ${destination}`,
    false
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

    if (path.includes('/target/types/') || path.includes('/target/public/')) {
      continue;
    }
    const pathLine = `${path}:${line}`;

    if (UPDATED_RELATIVE_PATHS.has(pathLine)) {
      const message = `Cannot replace multiple occurrences of "${match}" in the same line, please fix manually:\t${pathLine}`;
      SCRIPT_ERRORS.push(message);
    } else {
      const escapedMatch = match.replaceAll('/', '\\/').replaceAll('.', '\\.'); // escape '.' too (regexp any char)
      const escapedReplacement = new Array(matchDepth + relativeDepthDiff).fill('..').join('\\/');

      await safeExec(`sed -i '' "${line}s/${escapedMatch}/${escapedReplacement}/" ${path}`, false);
      UPDATED_RELATIVE_PATHS.add(pathLine);
    }
  }
};
