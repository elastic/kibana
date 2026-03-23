/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename, join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { orderBy } from 'lodash';
import { KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';
import type { Package } from '../types';
import { HARDCODED_MODULE_PATHS, applyTransforms } from './transforms';
import {
  BASE_FOLDER,
  BASE_FOLDER_DEPTH,
  EXTENSIONS,
  KIBANA_FOLDER,
  NO_GREP,
  SCRIPT_ERRORS,
  UPDATED_REFERENCES,
  UPDATED_RELATIVE_PATHS,
} from '../constants';
import { quietExec, safeExec } from './exec';

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
  const fullPath = module.directory.startsWith(BASE_FOLDER)
    ? module.directory
    : join(BASE_FOLDER, module.directory);

  let moduleDelimiter: string;
  if (HARDCODED_MODULE_PATHS[module.id]) {
    return join(BASE_FOLDER, HARDCODED_MODULE_PATHS[module.id]);
  } else if (module.isDevOnly()) {
    // only packages can be devOnly
    moduleDelimiter = '/packages/';
  } else if (!fullPath.includes('/plugins/') && !fullPath.includes('/packages/')) {
    throw new Error(
      `The module ${module.id} is not located under a '*/plugins/*' or '*/packages/*' folder`
    );
  } else if (fullPath.includes('/plugins/') && fullPath.includes('/packages/')) {
    moduleDelimiter = isPlugin ? '/plugins/' : '/packages/';
  } else {
    moduleDelimiter = fullPath.includes('/plugins/') ? '/plugins/' : '/packages/';
  }

  // for platform modules that are in a sustainable folder, strip the /private/ or /shared/ part too
  if (module.directory.includes(`${moduleDelimiter}private/`)) {
    moduleDelimiter += 'private/';
  } else if (module.directory.includes(`${moduleDelimiter}shared/`)) {
    moduleDelimiter += 'shared/';
  }

  const chunks = fullPath.split(moduleDelimiter);
  chunks.shift(); // remove the base path up to '/packages/' or '/plugins/'
  const moduleFolder = chunks.join(moduleDelimiter); // in case there's an extra /packages/ or /plugins/ folder

  let path: string;

  if (group === 'platform') {
    if (
      fullPath.includes(`/${KIBANA_FOLDER}/packages/core/`) ||
      fullPath.includes(`/${KIBANA_FOLDER}/src/core/packages`)
    ) {
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
  } else if (KIBANA_SOLUTIONS.some((solution) => solution === group)) {
    path = join(
      BASE_FOLDER,
      'x-pack', // all solution modules are 'x-pack'
      'solutions',
      group,
      isPlugin ? 'plugins' : 'packages',
      moduleFolder
    );
  } else {
    path = fullPath;
  }

  // after-creation transforms
  return applyTransforms(module, path);
};

export const isInTargetFolder = (module: Package): boolean => {
  return module.directory.startsWith(calculateModuleTargetFolder(module));
};

export const replaceReferences = async (module: Package, destination: string, log: ToolingLog) => {
  const dir = module.directory;
  const source =
    dir.startsWith(KIBANA_FOLDER) || dir.startsWith(`/${KIBANA_FOLDER}`)
      ? join(BASE_FOLDER, dir)
      : dir;
  const relativeSource = source.replace(BASE_FOLDER, '');
  const relativeDestination = destination.replace(BASE_FOLDER, '');

  if (relativeSource.split('/').length === 1) {
    log.warning(
      `Cannot replace references of a 1-level relative path '${relativeSource}'. Skipping.`
    );
    return;
  }

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
  matchingFiles.push('.github/CODEOWNERS'); // to update references in the manual section, thanks pgayvallet!

  for (let i = 0; i < matchingFiles.length; ++i) {
    const file = matchingFiles[i];
    if (file.includes('/target/types/') || file.includes('/target/public/')) {
      continue;
    }

    let d = dst;
    // For .bazel references, we need to keep the original name reference if we are renaming the path
    // For example, in the move "packages/core/base/core-base-common" to "src/core/packages/base/common",
    // we need to keep the reference name to core-base-common by replacing it with "src/core/packages/base/common:core-base-common"
    if (
      file.endsWith('.bazel') &&
      relativeDestination.startsWith('src/core/packages/') && // Only on core packages for now, since are the ones being renamed
      basename(relativeSource) !== basename(relativeDestination)
    ) {
      d = `${dst}:${basename(relativeSource)}`;
    }
    const md5Before = (await quietExec(`md5 ${file} --quiet`)).stdout.trim();
    // if we are updating packages/cloud references, we must pay attention to not update packages/cloud_defend too
    await safeExec(`sed -i '' -E "/${src}[\-_a-zA-Z0-9]/! s/${src}/${d}/g" ${file}`, false);
    const md5After = (await quietExec(`md5 ${file} --quiet`)).stdout.trim();

    if (md5Before !== md5After) {
      UPDATED_REFERENCES.add(file);
    }
  }

  // plugins\/pluginName special treatment (.buildkite/scripts/pipelines/pull_request/pipeline.ts)
  const backFwdSrc = relativeSource.replaceAll('/', `\\\\\\/`);
  const backFwdDst = relativeDestination.replaceAll('/', `\\\\\\/`);
  await safeExec(
    `sed -i '' -E '/${backFwdSrc}[\-_a-zA-Z0-9]/! s/${backFwdSrc}/${backFwdDst}/g' .buildkite/scripts/pipelines/pull_request/pipeline.ts`,
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
