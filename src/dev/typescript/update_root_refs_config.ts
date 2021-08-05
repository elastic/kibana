/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import { REPO_ROOT, ToolingLog } from '@kbn/dev-utils';

import { ROOT_REFS_CONFIG_PATH } from './build_ts_refs';
import { PROJECTS } from './projects';
import { Project } from './project';

const sort = (arr: string[]) => arr.slice().sort((a, b) => a.localeCompare(b));

export async function updateRootRefsConfig(log: ToolingLog) {
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
        references: newRefs.map((path) => ({ path })),
      },
      null,
      2
    ) + '\n'
  );
}
