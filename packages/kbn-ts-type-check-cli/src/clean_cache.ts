/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import { asyncForEachWithLimit } from '@kbn/std';

import { LOCAL_CACHE_ROOT } from './archive/constants';

export async function cleanCache() {
  const { TS_PROJECTS } = await import('@kbn/ts-projects');
  const { cleanupRootRefsConfig } = await import('../root_refs_config');

  await asyncForEachWithLimit(TS_PROJECTS, 10, async (proj) => {
    await Fsp.rm(Path.resolve(proj.directory, 'target/types'), {
      force: true,
      recursive: true,
    });
  });

  await Fsp.rm(LOCAL_CACHE_ROOT, {
    force: true,
    recursive: true,
  });

  await asyncForEachWithLimit(TS_PROJECTS, 10, async (proj) => {
    await Fsp.rm(proj.typeCheckConfigPath, { force: true });
  });

  await cleanupRootRefsConfig();
}
