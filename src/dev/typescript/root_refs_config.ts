/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import { REPO_ROOT, ToolingLog, createFailError } from '@kbn/dev-utils';

import { PROJECTS } from './projects';
import { Project } from './project';

export const ROOT_REFS_CONFIG_PATH = Path.resolve(REPO_ROOT, 'tsconfig.refs.json');
export const REF_CONFIG_PATHS = [ROOT_REFS_CONFIG_PATH];

const sort = (arr: string[]) => arr.slice().sort((a, b) => a.localeCompare(b));

async function analyzeRootRefsConfig(log: ToolingLog) {
  const compositeProjects = PROJECTS.filter((p) => p.isCompositeProject() && !p.disableTypeCheck);
  const currentRefs = sort(new Project(ROOT_REFS_CONFIG_PATH).getRefdPaths());
  const newRefs = sort(
    compositeProjects.map((p) => `./${Path.relative(REPO_ROOT, p.tsConfigPath)}`)
  );

  log.verbose('updating root refs config file');
  log.verbose('existing composite projects', currentRefs);
  log.verbose('found the following composite projects', newRefs);

  const removedRefs: string[] = [];
  const addedRefs: string[] = [];

  for (let i = 0; i < currentRefs.length || i < newRefs.length; ) {
    const currentRef = currentRefs[i];
    const newRef = newRefs[i];
    if (currentRef === newRef) {
      // continue with next item
      i++;
      continue;
    }

    // see if this item is lower down in current refs
    const newIndex = currentRefs.indexOf(newRef, i + 1);
    if (newIndex === -1) {
      addedRefs.push(newRef);
      currentRefs.splice(i, 0, newRef);
      // recheck this index
      continue;
    }

    // this item was removed from currentRefs
    removedRefs.push(currentRef);
    currentRefs.splice(i, 1);
    // recheck this index
    continue;
  }

  return {
    refs: newRefs,
    addedRefs,
    removedRefs,
  };
}

export async function validateRootRefsConfig(log: ToolingLog) {
  const { addedRefs, removedRefs } = await analyzeRootRefsConfig(log);

  for (const addedRef of addedRefs) {
    log.warning('Missing reference to composite project', addedRef, 'in root refs config file');
  }
  for (const removedRef of removedRefs) {
    log.warning('Extra reference to non-composite project', removedRef, 'in root refs config file');
  }

  if (addedRefs.length || removedRefs.length) {
    throw createFailError(
      'tsconfig.refs.json at the root of the repo is not valid and needs to be updated. Please run `node scripts/build_ts_refs` locally and commit the changes'
    );
  }
}

export async function updateRootRefsConfig(log: ToolingLog) {
  const { refs, addedRefs, removedRefs } = await analyzeRootRefsConfig(log);

  if (removedRefs.length === 0 && addedRefs.length === 0) {
    log.verbose('root refs config file is up-to-date');
    return;
  }

  for (const addedRef of addedRefs) {
    log.info('Adding ref to composite project', addedRef, 'to root refs config file');
  }
  for (const removedRef of removedRefs) {
    log.info('Removing ref to composite project', removedRef, 'to root refs config file');
  }

  await Fs.writeFile(
    ROOT_REFS_CONFIG_PATH,
    JSON.stringify(
      {
        include: [],
        references: refs.map((path) => ({ path })),
      },
      null,
      2
    ) + '\n'
  );
}
